"use strict";

var titleFilter = function() {
  return function(name) {
    switch (name) {
      case "price_range": return "Price";
      default: return "N/A";
    }
  };
};

module.exports = {
  titleFilter: titleFilter
};
