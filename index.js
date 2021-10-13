import * as cheerio from 'cheerio'
import axios from 'axios'
import { urlConfig } from "./config.js"
import putSpecies from "./put.js"

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

async function scrapeInitial(actualId = 1){
  const $ = await getCheerio(urlConfig.MY_INITIAL_URL + "&page=" + actualId)
  let interval = 1000
  $("table.table.left tr").each(async function(i, speciesAllData){      // Especies loop
    setTimeout(
      ()=>{
        if(i===0){return}
        if(i===300){
          scrapeInitial(actualId+1)
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
                  if(species["scientific_name"] == extraInfo["scientific_name"]){
                    species["info"] = {
                      ...species["info"],
                      ...extraInfo["info"]
                    }
                  } else {
                    reject("Error!!! - SCIENTIFIC NAME DOES NOT MATCH")
                  }
                  resolve("SUCCESS")
                }
              )
              promises.push(extraInfoPromise)                           // Added to promises list
              break
          }
        })
        Promise.all(promises).then(                                     // Waiting for all promises about extra info to finish   
          async () => {
            await putSpecies(species)
          }
        )
      }, (i-1)*interval                                                 // Para no saturar la web
    )
  })
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

function processText ($, $container, switchFunc){
  $container.children("span").each(function(i, span){
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
            processText($, $container, switchFunc)
          } else if (numOfIngles === 1){
            let switchFunc = switchGenerator(
              names.concat(twoEmpty).concat([extraNames[0]]).concat(ecoInfo),
              extraInfo
            )
            processText($, $container, switchFunc)
          } else if (numOfIngles === 0){
            let switchFunc = switchGenerator(
              names.concat(twoEmpty).concat(ecoInfo),
              extraInfo
            )
            processText($, $container, switchFunc)
          } else {
            let switchFunc = switchGenerator(
              names.concat(twoEmpty).concat(ecoInfo),
              extraInfo
            )
            processText($, $container, switchFunc)
          }
        } else {
          let switchFunc = switchGenerator(
            names.concat(twoEmpty).concat(ecoInfo),
            extraInfo
          )
          processText($, $container, switchFunc)
        }
      } else if ($children.hasClass("nombreingles")){
        let numOfIngles = $children.filter((i,el)=>$(el).hasClass("nombreingles")).length
        if(numOfIngles === 2){
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat(extraNames).concat(ecoInfo),
            extraInfo
          )
          processText($, $container, switchFunc)
        } else if (numOfIngles === 1){
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat([extraNames[0]]).concat(ecoInfo),
            extraInfo
          )
          processText($, $container, switchFunc)
        } else if (numOfIngles === 0){
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat(ecoInfo),
            extraInfo
          )
          processText($, $container, switchFunc)
        } else {
          let switchFunc = switchGenerator(
            [names[1]].concat(twoEmpty).concat(ecoInfo),
            extraInfo
          )
          processText($, $container, switchFunc)
        }
      } else {
        let switchFunc = switchGenerator(
          [names[1]].concat(twoEmpty).concat(ecoInfo),
          extraInfo
        )
        processText($, $container, switchFunc)
      }
      resolve(extraInfo)
    }
  )
  return promise
}

scrapeInitial()