import * as cheerio from 'cheerio'
import axios from 'axios'
import { urlConfig } from "./config.js"
//import putSpecies from './dynamoUtils/putSpecies.js'
import uploadSpecies from './firebaseUtils/uploadSpecies.js'

function parseLink(path){
  let link = path.replace("..", urlConfig.MY_URL)
  return link
}

async function getCheerio(url){
  const response = await axios.request({
    method: 'GET',
    url: url,
    responseEncoding: 'binary'
  })
  const html = response.data.toString('latin1')
  const $ = cheerio.load(html,{decodeEntities: false})
  return $
}

async function scrapeAll(){
  let allSpecies = []
  for(let i = 1; i <= 22; i++){
    try {
      let groupSpecies = await scrapeInitial(i)
      allSpecies = allSpecies.concat(groupSpecies)
    } catch (error) {
      console.log("Error: ",error)
    }
  }
  uploadSpecies(allSpecies, "Species")
}

async function scrapeInitial(grupoId = 8, actualId = 1,allSpecies=[]){
  const url = urlConfig.MY_INITIAL_URL + "&idgrupoclase=" + grupoId + "&page=" + actualId
  const $ = await getCheerio(url)
  
  console.log(url)

  let interval = 1000
  const speciesPromises = []
  $("table.table.left tr").each(async function(i, speciesAllData){      // Especies loop
    const speciesPromise = new Promise(
      async (speciesResolver, reject) => {
        setTimeout(
          ()=>{
            if(i===0){
              speciesResolver("SUCCESS-null")
              return
            }
      
            let $speciesAllData = $(speciesAllData)
            const species = {info:{}}
            const promises = []
            console.log("id:",i+(actualId-1)*300)                           // Print id
            $speciesAllData.children("td").each(async function(i,data){     // Data de especie loop
              let $data = $(data)
              let text = $data.text().replace(/\s/g, " ")                   // Texto de la data
              switch(i){                                                    // Switch case based on column
                case 3:
                  species["nombre_comun"] = text
                  break
                case 4:
                  species["info"]["nombre_ingles"] = text
                  break
                case 5:
                  species["info"]["nombre_port"] = text
                  break
                case 6:
                  species["scientific_name"] = text
                  let path = $data.children("a").attr("href")
                  let link = parseLink(path)
                  species["url"] = link
                  const extraInfoPromise = new Promise(                     // Promise for extra info about this species.
                    async (resolve, reject) => {                            // Resolved after adding extra info to species info
                      let extraInfo = await scrapeSpecific(link)
                      console.log(species, extraInfo)
                      if(species["scientific_name"] == extraInfo["scientific_name"]){
                        species["info"] = {
                          ...species["info"],
                          ...extraInfo["info"]
                        }
                      } else {
                        console.log("Error!!! - SCIENTIFIC NAME DOES NOT MATCH")
                        reject("Error!!! - SCIENTIFIC NAME DOES NOT MATCH")
                      }
                      resolve("SUCCESS")
                    }
                  )
                  promises.push(extraInfoPromise)                           // Added to promises list
                  break
              }
            })

            if(i===300){
              promises.push(scrapeInitial(grupoId,actualId+1,allSpecies))
            }

            Promise.all(promises).then(                                     // Waiting for all promises about extra info to finish   
              async () => {
                allSpecies.push(species)
                //await putSpecies(species)
                speciesResolver("SUCCESS")
              }
            )
          }, (i-1)*interval                                                 // Para no saturar la web
        )
      }
    )
    speciesPromises.push(speciesPromise)
  })
  await Promise.all(speciesPromises)
  return allSpecies
}

function switchGenerator (opts, extraInfo){
  let switchFunc = (i, text) => {
    if(opts[i]){
      let filteredText = text
      if(text.indexOf(":")>-1){
        filteredText = text.replace(/[\w\sÀ-ÿ\u00f1\u00d1/]+:[\s]+/,"")
      }
      if(opts[i][0]){
        extraInfo["info"][opts[i][1]] = filteredText
      } else {
        extraInfo[opts[i][1]] = filteredText
      }
    }
  }
  return switchFunc
}

function processText ($, $children, switchFunc){
  $children.each(function(i, span){
    let $span = $(span)
    let text = $span.text().replace(/\s/g, " ")
    switchFunc(i,text)
  })
}

async function scrapeSpecific(link){
  console.log("scrapeSpecific")
  let promise = new Promise(
    async (resolve, reject) => {
      const $ = await getCheerio(link)
      const extraInfo = {info:{}}
      const $container = $("div.text-start")
      const $children = $container.children("span")

      const names = [[false, "nombre_comun"],[false,"scientific_name"]]
      const twoEmpty = [false,false]
      const extraNames = [[true, "nombre_ingles"],[true,"nombre_port"]]
      const ecoInfo = [[true, "familia"], [true, "orden"], [true, "clase"], [true, "filo"], [true, "reino"]]

      if($children.hasClass("nombreComunGrande")){
        if($children.hasClass("nombreingles")){
          let numOfIngles = $children.filter((i,el)=>$(el).hasClass("nombreingles")).length
          if(numOfIngles === 2){
            let switchFunc = switchGenerator(
              names.concat(twoEmpty).concat(extraNames).concat(ecoInfo),
              extraInfo
            )
            processText($, $children, switchFunc)
          } else if (numOfIngles === 1){
            let switchFunc = switchGenerator(
              names.concat(twoEmpty).concat([extraNames[0]]).concat(ecoInfo),
              extraInfo
            )
            processText($, $children, switchFunc)
          } else if (numOfIngles === 0){
            let switchFunc = switchGenerator(
              names.concat(twoEmpty).concat(ecoInfo),
              extraInfo
            )
            processText($, $children, switchFunc)
          } else {
            let switchFunc = switchGenerator(
              names.concat(twoEmpty).concat(ecoInfo),
              extraInfo
            )
            processText($, $children, switchFunc)
          }
        } else {
          let switchFunc = switchGenerator(
            names.concat(twoEmpty).concat(ecoInfo),
            extraInfo
          )
          processText($, $children, switchFunc)
        }
      } else if ($children.hasClass("nombreingles")){
        let numOfIngles = $children.filter((i,el)=>$(el).hasClass("nombreingles")).length
        if(numOfIngles === 2){
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat(extraNames).concat(ecoInfo),
            extraInfo
          )
          processText($, $children, switchFunc)
        } else if (numOfIngles === 1){
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat([extraNames[0]]).concat(ecoInfo),
            extraInfo
          )
          processText($, $children, switchFunc)
        } else if (numOfIngles === 0){
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat(ecoInfo),
            extraInfo
          )
          processText($, $children, switchFunc)
        } else {
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat(ecoInfo),
            extraInfo
          )
          processText($, $children, switchFunc)
        }
      } else {
        let switchFunc = switchGenerator(
          [names[1]].concat(twoEmpty).concat(ecoInfo),
          extraInfo
        )
        processText($, $children, switchFunc)
      }

      const $registersCont = $('div.center')
      const $registers = $registersCont.children('div[style*=width:300px]')
      const allRegisters = []
      $registers.each(function(i, registry){
        let $registry = $(registry)
        let imagePath = $registry.find("img#imagenChica")[0].attribs.src
        let imageUrl = parseLink(imagePath)
        const registryData = {}
        registryData["imgUrl"] = imageUrl

        let dataCont = $registry.children("font")
        let prov = ""
        $(dataCont).children("a").each((i,val)=>{
          let $val = $(val)
          let href = $val.attr("href")
          let text = $val.text().replace(/\s/g, " ")
          if(href.indexOf("lugardetallado.php") > -1){
            registryData["zona"] = text
          } else if(href.indexOf("lugar.php") > -1){
            registryData["ciudad"] = text
          } else if(href.indexOf("provincia.php") > -1){
            prov = text
          } else if(href.indexOf("php") == -1){
            registryData["autor"] = text
          }
        })
        if(prov == "Entre Ríos"){
          allRegisters.push(registryData) 
        }
      })
      extraInfo["info"]["registers"] = allRegisters
      resolve(extraInfo)
    }
  )
  return promise
}

scrapeAll()