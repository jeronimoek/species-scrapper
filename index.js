import scrapeIt from "scrape-it"
import config from "./config.js"

function parseLink(path){
  let link = path.replace("..", config.MY_URL)
  return link
}

function scrapePhoto(link){
  scrapeIt(link,{
    photo: {
      selector: "img",
      eq: 1,
      attr: "src",
      convert: parseLink
    }
  }, (err, {data}) => {
    console.log(err || data)
  })
}


scrapeIt(config.MY_INITIAL_URL,{
  species: {
    listItem: "table.table.left > tr",
    data: {
      title: "a.nc",
      path: {
        selector: "a.nc",
        attr: "href",
        convert: parseLink
      }
    }
  }
}, (err, { data }) => {
  if(err){
    console.log(err)
  } else {
    data.species.map(specie => {
      console.log(specie.title, specie.path)
      let link = parseLink(specie.path)
      link ? scrapePhoto(link) : null
    })
  }
})