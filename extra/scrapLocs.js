import * as cheerio from 'cheerio'
import axios from 'axios'
import { urlConfig } from "../config.js"
import putLocs from '../dynamoUtils/putLocs.js'
import uploadLocs from '../firebaseUtils/uploadLocs.js'

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
  var places = {}
  for(let i = 1; i <= 22; i++){
    try {
      places = await scrapeGroup(places, i)
    } catch (error) {
      console.log("Error: ",error)
    }
    //console.log(places)
  }
  uploadLocs(places)
  //await putLocs(places)
}

async function scrapeGroup(places = {}, grupoId = 8, actualId = 1){
  const link = urlConfig.MY_INITIAL_URL + "&idgrupoclase=" + grupoId + "&page=" + actualId
  console.log(link)
  const $ = await getCheerio(link)
  let interval = 500
  const speciesPromises = []
  $("table.table.left tr").each(async function(i, speciesAllData){          // Especies loop
    const speciesPromise = new Promise(
      async (speciesResolver, reject) => {
        setTimeout(
          async ()=>{
            if(i===0){
              speciesResolver("SUCCESS-null")
              return
            }
      
            let $speciesAllData = $(speciesAllData)
            const extraInfoPromises = []
            console.log("id:",i+(actualId-1)*300)                           // Print id
            $speciesAllData.children("td").each(async function(i,data){     // Data de especie loop
              if(i==6){
                let $data = $(data)
                let text = $data.text().replace(/\s/g, " ") 
                let scName = text
                let path = $data.children("a").attr("href")
                let link = parseLink(path)
                const extraInfoPromise = new Promise(                       // Promise for extra info about this species.
                  async (extraInfoResolve, reject) => {                     // Resolved after adding extra info to species info
                    let allRegisters = await scrapeSpecific(link)
                    for(let registry of allRegisters){
                      if(!places[registry.lugar]){                          // Register lugar
                        if(registry.lugarDetallado){
                          places = {
                            ...places,
                            ...{[registry.lugar]: {"lugar": registry.lugar, "count":1 , "lugaresDetallados": {[registry.lugarDetallado] : {"species": [scName]}}, "species": []}}
                          }
                        } else {
                          places = {
                            ...places,
                            ...{[registry.lugar]: {"lugar": registry.lugar, "count":1 , "lugaresDetallados": {}, "species": [scName]}}
                          }
                        }
                      } else {
                        if(!places[registry.lugar].lugaresDetallados[registry.lugarDetallado]){
                          if(registry.lugarDetallado){
                            places[registry.lugar].lugaresDetallados[registry.lugarDetallado] = {"species": [scName]}
                            places[registry.lugar].count += 1
                          } else {
                            if(places[registry.lugar].species.indexOf(scName) === -1){
                              places[registry.lugar].species.push(scName)
                              places[registry.lugar].count += 1
                            }
                          }
                        } else {
                          if(registry.lugarDetallado){
                            if (places[registry.lugar].lugaresDetallados[registry.lugarDetallado].species.indexOf(scName) === -1){
                              places[registry.lugar].lugaresDetallados[registry.lugarDetallado].species.push(scName)
                              places[registry.lugar].count += 1
                            }
                          } else {
                            if (places[registry.lugar].species.indexOf(scName) === -1){
                              places[registry.lugar].species.push(scName)
                              places[registry.lugar].count += 1
                            }
                          }
                        }
                      }
                    }
                    extraInfoResolve("SUCCESS")
                  }
                )
                extraInfoPromises.push(extraInfoPromise)                    // Added to promises list
              }
            })
            
            if(i===300){
              extraInfoPromises.push(scrapeGroup(places, grupoId, actualId+1))
            }
            
            Promise.all(extraInfoPromises).then(                            // Waiting for all promises about extra info to finish   
              () => {
                //console.log("places: ",places,"msg: ",msg)
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
  return places
}

async function scrapeSpecific(link){
  console.log("scrapeSpecific")
  let promise = new Promise(
    async (resolve, reject) => {
      const $ = await getCheerio(link)
      const $registersCont = $('div.center')
      const $registers = $registersCont.children('div[style*=width:300px]')
      const allRegisters = []
      $registers.each(function(i, registry){
        let $registry = $(registry)
        const registryData = []
        let dataCont = $registry.children("font")
        let prov = ""
        $(dataCont).children("a").each((i,val)=>{
          let $val = $(val)
          let href = $val.attr("href")
          let text = $val.text().replace(/\s/g, " ")
          if(href.indexOf("lugardetallado.php") > -1){
            registryData["lugarDetallado"] = text
          } else if(href.indexOf("lugar.php") > -1){
            registryData["lugar"] = text
          } else if(href.indexOf("provincia.php") > -1){
            prov = text
          }
        })
        if(prov == "Entre Ríos"){
          allRegisters.push(registryData) 
        }
      })
      resolve(allRegisters)
    }
  )
  return promise
}

scrapeAll()