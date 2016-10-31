function hashify(obj) {
  if (!obj) {
    return obj
  }

  var copy = {};

  for (var key in obj) {
    var value = obj[key];

    if (obj.hasOwnProperty(key)) {

      if (Array.isArray(value)) {
        var arr = Opal.Array.$new()

          for (var i = 0; i < value.length; ++i) {
            var val = value[i];
            if (typeof val === 'boolean' || typeof val === 'string') {
              arr.$push(val);
            } else {
              arr.$push(hashify(val));
            }
          }
        copy[key] = arr;
      } else if (typeof value === 'object') {
        copy[key] = hashify(value)
      } else if (typeof value === 'boolean' || typeof value == 'string') {
        copy[key] = value;
      } else {
        var data = {};
        data[key] = value
        return Opal.hash2([key], data)
      }
    }
  }
  return Opal.hash2(Object.getOwnPropertyNames(obj), copy)
}

module.exports = hashify
