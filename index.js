'use strict';

var rbush = require('rbush');
var lineclip = require('lineclip');

module.exports = whichPolygon;

function whichPolygon(data) {
    var bboxes = [];
    for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i];
        var coords = feature.geometry.coordinates;

        if (feature.geometry.type === 'Polygon') {
            bboxes.push(treeItem(coords, feature.properties));

        } else if (feature.geometry.type === 'MultiPolygon') {
            for (var j = 0; j < coords.length; j++) {
                bboxes.push(treeItem(coords[j], feature.properties));
            }
        }
    }

    var tree = rbush().load(bboxes);

    function query(p) {
        var result = tree.search({
            minX: p[0],
            minY: p[1],
            maxX: p[0],
            maxY: p[1]
        });
        for (var i = 0; i < result.length; i++) {
            if (insidePolygon(result[i].coords, p)) return result[i].props;
        }
        return null;
    }

    query.tree = tree;
    query.bbox = function queryBBox(bbox) {
        var output = [];
        var result = tree.search({
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3]
        });
        var bboxCenter = [
            (bbox[0] + bbox[2]) / 2,
            (bbox[1] + bbox[3]) / 2
        ];
        for (var i = 0; i < result.length; i++) {
            var coords = result[i].coords;
            if (insidePolygon(coords, bboxCenter) || lineclip(coords[0], bbox).length > 0) {
                output.push(result[i].props);
            }
        }
        return output;
    };

    return query;
}

// ray casting algorithm for detecting if point is in polygon
function insidePolygon(rings, p) {
    var inside = false;
    for (var i = 0, len = rings.length; i < len; i++) {
        var ring = rings[i];
        for (var j = 0, len2 = ring.length, k = len2 - 1; j < len2; k = j++) {
            if (rayIntersect(p, ring[j], ring[k])) inside = !inside;
        }
    }
    return inside;
}

function rayIntersect(p, p1, p2) {
    return ((p1[1] > p[1]) !== (p2[1] > p[1])) && (p[0] < (p2[0] - p1[0]) * (p[1] - p1[1]) / (p2[1] - p1[1]) + p1[0]);
}

function treeItem(coords, props) {
    var item = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
        coords: coords,
        props: props
    };

    for (var i = 0; i < coords[0].length; i++) {
        var p = coords[0][i];
        item.minX = Math.min(item.minX, p[0]);
        item.minY = Math.min(item.minY, p[1]);
        item.maxX = Math.max(item.maxX, p[0]);
        item.maxY = Math.max(item.maxY, p[1]);
    }
    return item;
}
