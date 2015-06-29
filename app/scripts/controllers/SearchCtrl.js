"use strict";

var algoliasearchHelper = require('algoliasearch-helper');
var forEach = require('lodash.foreach');

var SearchCtrl = function($scope, $sce, $timeout, $location, algolia) {
  $scope.client = algolia.Client('latency', 'db2af085e1f7dc80f93178182b76ddca');
  $scope.helper = algoliasearchHelper($scope.client, 'magento-connect', {
    facets: ['price_range'],
    disjunctiveFacets: ['rating_i'],
    maxValuesPerFacet: 10
  });
  $scope.q = $location.search().q || '';
  $scope.page = 0;

  var blurring = null;
  var blurredAt = new Date().getTime();
  var delayedContent = null;
  var unblur = function(content) {
    $scope.blurred = false;
    if (blurring) {
      $timeout.cancel(blurring);
      blurring = null;
    }
    blurredAt = new Date().getTime();

    if (!content || content.page === 0) {
      if (content) {
        content.promoted = !!content.query;
        forEach(content.hits, function(hit) {
          if (hit.title.indexOf('Algolia') > -1) {
            content.promoted = false;
            return false;
          }
        });
      }
      $scope.content = content;
    } else {
      forEach(content.hits, function(hit) {
        hit.concatenated = true;
      });
      $scope.content.hits = $scope.content.hits.concat(content.hits);
    }

    if (content && content.query) {
      $location.search('q', content.query).replace();
    }
  };

  $scope.helper.on('result', function(content) {
    content.ratingFacet = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    forEach(content.disjunctiveFacets, function(facet) {
      if (facet.name === 'rating_i') {
        forEach(facet.data, function(count, value) {
          var rating = +value;
          if (rating < 1) {
            // skip
          } else if (rating < 2) {
            content.ratingFacet[1] += count;
          } else if (rating < 3) {
            content.ratingFacet[2] += count;
          } else if (rating < 4) {
            content.ratingFacet[3] += count;
          } else if (rating < 5) {
            content.ratingFacet[4] += count;
          } else {
            content.ratingFacet[5] += count;
          }
        });
      }
    });

    forEach(content.hits, function(hit) {
      hit.stars = [];
      for (var i = 1; i <= 5; ++i) {
        if (hit.rating >= i) {
          hit.stars.push(true);
        } else {
          hit.stars.push(false);
        }
      }
    });

    $scope.$apply(function() {
      var now = new Date().getTime();
      if (!$scope.blurred || !$scope.q || ($scope.content && $scope.content.hits.length === 0) || blurredAt + 1500 < now) {
        unblur(content);
      } else {
        delayedContent = content;
      }
    })
  });

  $scope.$watch('q', function(q) {
    $scope.blurred = true;
    $scope.page = 0;
    blurring && $timeout.cancel(blurring);
    blurring = $timeout(function() {
      unblur(delayedContent);
    }, 50);

    $scope.helper.setQuery(q).search();
  });

  $scope.toggleRefine = function($event, facet, value) {
    $event.preventDefault();
    $scope.helper.setCurrentPage(0).toggleRefine(facet, value).search();
  };

  $scope.submit = function() {
    unblur(delayedContent || $scope.content);
  };

  $scope.loadMore = function() {
    $scope.page += 1;
    $scope.helper.setCurrentPage($scope.page).search();
  };

  $scope.range = function(v) {
    return new Array(v);
  };
};

module.exports = SearchCtrl;
