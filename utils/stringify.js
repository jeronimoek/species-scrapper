function stringify(value, use) {
  const lastKey = Object.keys(value).pop();
  let objString = '';
  if(use && use === "SET"){
    if (typeof value === 'object') {
      for (const key in value) {
        if(key !== "scientific_name"){
          objString += `SET ${key}=${stringify(value[key])}`;
          if (key !== lastKey) {
            objString += ' ';
          }
        }
      }
    } else if (typeof value === 'string') {
      objString += `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number') {
      objString += `${value}`;
    }
    return objString;
  }
  if (typeof value === 'object') {
    objString += '{';
    for (const key in value) {
      if(value[key]){
        objString += `'${key}':${stringify(value[key])}`;
        if (key !== lastKey) {
          objString += ',';
        }
      } else {
        if(key === lastKey && objString.slice(objString.length - 1) === ","){
          objString = objString.slice(0,objString.length - 1)
        }
      }
    }
    objString += '}';
  } else if (typeof value === 'string') {
    objString += `'${value.replace(/'/g, "''")}'`;
  } else if (typeof value === 'number') {
    objString += `${value}`;
  }
  return objString;
}

export default stringify