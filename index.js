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

async function scrapeSpecific(link){
  console.log("scrapeSpecific")
  let promise = new Promise(
    async (resolve, reject) => {
      const $ = await getCheerio(link)
      const extraInfo = {info:{}}
      const $container = $("div.text-start")
      const $children = $container.children("span")
      if(!$children.hasClass("nombreComunGrande")){
        if($children.hasClass("nombreingles")){
          let numOfIngles = $children.filter((i,el)=>$(el).hasClass("nombreingles")).length
          if(numOfIngles === 2){
            $container.children("span").each(function(i, span){
              let $span = $(span)
              let text = $span.text().replace(/\s/g, " ")
              switch(i){
                case 0:
                  extraInfo["nombre_comun"] = text
                  break
                case 1:
                  extraInfo["scientific_name"] = text
                  break
                case 3:
                  extraInfo["info"]["nombre_ingles"] = text
                  break
                case 4:
                  extraInfo["info"]["nombre_port"] = text
                  break
                case 5:
                  extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                  break
                case 6:
                  extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                  break
                case 7:
                  extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                  break
                case 8:
                  extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                  break
                case 9:
                  extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                  break
              }
            })
          } else if (numOfIngles === 1){
            $container.children("span").each(function(i, span){
              let $span = $(span)
              let text = $span.text().replace(/\s/g, " ")
              switch(i){
                case 0:
                  extraInfo["scientific_name"] = text
                  break
                case 2:
                  extraInfo["info"]["nombre_ingles"] = text
                  break
                case 3:
                  extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                  break
                case 4:
                  extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                  break
                case 5:
                  extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                  break
                case 6:
                  extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                  break
                case 7:
                  extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                  break
              }
            })
          } else if (numOfIngles === 0){
            $container.children("span").each(function(i, span){
              let $span = $(span)
              let text = $span.text().replace(/\s/g, " ")
              switch(i){
                case 0:
                  extraInfo["scientific_name"] = text
                  break
                case 2:
                  extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                  break
                case 3:
                  extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                  break
                case 4:
                  extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                  break
                case 5:
                  extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                  break
                case 6:
                  extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                  break
              }
            })
          } else {
            $container.children("span").each(function(i, span){
              let $span = $(span)
              let text = $span.text().replace(/\s/g, " ")
              switch(i){
                case 0:
                  extraInfo["scientific_name"] = text
                  break
                case 2:
                  extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                  break
                case 3:
                  extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                  break
                case 4:
                  extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                  break
                case 5:
                  extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                  break
                case 6:
                  extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                  break
              }
            })
          }
        } else {
          $container.children("span").each(function(i, span){
            let $span = $(span)
            let text = $span.text().replace(/\s/g, " ")
            switch(i){
              case 0:
                extraInfo["scientific_name"] = text
                break
              case 2:
                extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                break
              case 3:
                extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                break
              case 4:
                extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                break
              case 5:
                extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                break
              case 6:
                extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                break
            }
          })
        }
      } else if ($children.hasClass("nombreingles")){
        let numOfIngles = $children.filter((i,el)=>$(el).hasClass("nombreingles")).length
        if(numOfIngles === 2){
          $container.children("span").each(function(i, span){
            let $span = $(span)
            let text = $span.text().replace(/\s/g, " ")
            switch(i){
              case 0:
                extraInfo["nombre_comun"] = text
                break
              case 1:
                extraInfo["scientific_name"] = text
                break
              case 3:
                extraInfo["info"]["nombre_ingles"] = text
                break
              case 4:
                extraInfo["info"]["nombre_port"] = text
                break
              case 5:
                extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                break
              case 6:
                extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                break
              case 7:
                extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                break
              case 8:
                extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                break
              case 9:
                extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                break
            }
          })
        } else if (numOfIngles === 1){
          $container.children("span").each(function(i, span){
            let $span = $(span)
            let text = $span.text().replace(/\s/g, " ")
            switch(i){
              case 0:
                extraInfo["nombre_comun"] = text
                break
              case 1:
                extraInfo["scientific_name"] = text
                break
              case 3:
                extraInfo["info"]["nombre_ingles"] = text
                break
              case 4:
                extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                break
              case 5:
                extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                break
              case 6:
                extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                break
              case 7:
                extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                break
              case 8:
                extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                break
            }
          })
        } else if (numOfIngles === 0){
          $container.children("span").each(function(i, span){
            let $span = $(span)
            let text = $span.text().replace(/\s/g, " ")
            switch(i){
              case 0:
                extraInfo["nombre_comun"] = text
                break
              case 1:
                extraInfo["scientific_name"] = text
                break
              case 3:
                extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                break
              case 4:
                extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                break
              case 5:
                extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                break
              case 6:
                extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                break
              case 7:
                extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                break
            }
          })
        } else {
          $container.children("span").each(function(i, span){
            let $span = $(span)
            let text = $span.text().replace(/\s/g, " ")
            switch(i){
              case 0:
                extraInfo["nombre_comun"] = text
                break
              case 1:
                extraInfo["scientific_name"] = text
                break
              case 3:
                extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
                break
              case 4:
                extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
                break
              case 5:
                extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
                break
              case 6:
                extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
                break
              case 7:
                extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
                break
            }
          })
        }
      } else {
        $container.children("span").each(function(i, span){
          let $span = $(span)
          let text = $span.text().replace(/\s/g, " ")
          switch(i){
            case 0:
              extraInfo["nombre_comun"] = text
              break
            case 1:
              extraInfo["scientific_name"] = text
              break
            case 3:
              extraInfo["info"]["familia"] = text.replace("Familia:","").trim()
              break
            case 4:
              extraInfo["info"]["orden"] = text.replace("Orden:","").trim()
              break
            case 5:
              extraInfo["info"]["clase"] = text.replace("Clase:","").trim()
              break
            case 6:
              extraInfo["info"]["filo"] = text.replace("Filo / División:","").trim()
              break
            case 7:
              extraInfo["info"]["reino"] = text.replace("Reino:","").trim()
              break
          }
        })
      }
      resolve(extraInfo)
    }
  )
  return promise
}

scrapeInitial()