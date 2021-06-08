var urlPath;
var zzz;

var alerts = {};

var view;

var isSelectCalibration = false;

//* Global Variable for Storing Draw Shape Type
var shapeType;

//* Global Variable for Lucking Screen Movement
var lock = true;

//* Global Variable for dash line state
var isDashLine;

//* Global Variables for Actions
var actionOnMap;
var modify;

var imageName;
var imageUrl;

//* Global Variable for current selected item.
var selectedLayer = {};
var selectedFeature = {};

//* Zone Geo Json
var zoneGeoJson = {
  type: "FeatureCollection",
  features: [],
  image: "",
};
// cable
var alertList = {};

var addedCable = [];

// image file name
var tempImageName = "map-image.png";
// image files for copy
var tempImageInfo = {};
// image asset folder url
var imageAssetUrl = "assets/images/";

var map, vector;

var extent = [0, 0, 1024, 968];
var source;

var container = document.getElementById("popup");
var content = document.getElementById("popup-content");
var closer = document.getElementById("popup-closer");
var overlay = new ol.Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250,
  },
});

var tooltipContainer = document.getElementById("tooltip");
var tooltipContent = document.getElementById("tooltip-content");

var tooltip = new ol.Overlay({
  element: tooltipContainer,
  autoPan: true,
  autoPanAnimation: {
    duration: 500,
  },
});

closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

//* Init For First Rendering
initShapeType();
init();

/********* upload external geojson file and display **********/
var imagePath = "";
//* Upload Image
document
  .querySelector('input[name="input_file"]')
  .addEventListener("change", function () {
    if (this.files && this.files[0]) {
      let fileName = this.files[0].name;
      removeDivs();
      init(null, fileName, true);
    }
  });

//* Remove Extra Divs
function removeDivs() {
  $("div.ol-viewport").remove();
}

//* Set Draw Shape Type as "None"
function initShapeType() {
  setShapeType("None");
}

//* Set Current Selected Layer and Feature to empty Object
function initSelectedZone() {
  selectedLayer = {};
  selectedFeature = {};
}

//* Set Shape Type as type
function setShapeType(type) {
  shapeType = type;
}

//* Get Current Shape Type
function getShapeType() {
  return shapeType;
}

//* Set as DashLine
function setDashSize(size) {
  isDashLine = size;
}

//* ******************** Lock or Unlock Screen ******************** *//
$(document).on("click", "#lock", null, function () {
  lock = !lock;

  resetSideBar();
  $("#lock").parents("li:first").addClass("active");

  var dragPan;
  map.getInteractions().forEach(function (interaction) {
    if (interaction instanceof ol.interaction.DragPan) {
      dragPan = interaction;
    }
  }, this);
  zzz = dragPan;
  map.removeInteraction(dragPan);
});

$(document).on("click", "#unlock", null, function () {
  resetSideBar();
  $("#unlock").parents("li:first").addClass("active");
  if (zzz) map.addInteraction(zzz);
});

//* ******************** Rotate ******************** *//
$(document).on("click", "#rotate-left", null, function () {
  view.animate({
    rotation: view.getRotation() - Math.PI / 2,
  });
  resetSideBar();
  $("#rotate-left").parents("li:first").addClass("active");
});

$(document).on("click", "#rotate-right", null, function () {
  view.animate({
    rotation: view.getRotation() + Math.PI / 2,
  });
  resetSideBar();
  $("#rotate-right").parents("li:first").addClass("active");
});

$(document).on("click", "#scaling", null, function () {
  resetSideBar();
  $("#scaling").parents("li:first").addClass("active");
  $("#scaleModel").modal();
});

function alertControl(start) {
  var alertValList = [];
  var cableItemList = [];

  if (document.getElementById("txtblink").value) {
    cableItemList = document.getElementById("txtblink").value.split("|");
  } else {
    return;
  }

  for (let i = 0; i < cableItemList.length; i++) {
    var alertList = cableItemList[i].split(",");
    for (let j = 0; j < alertList.length; j++) {
      if (j === 0) {
        alertValList.push(alertList[0]);
      } else {
        var cableInfo = alertList[0].split("#");
        alertValList.push(`${cableInfo[0]}#${cableInfo[1]}#${alertList[j]}`);
      }
    }
  }

  for (let i = 0; i < alertValList.length; i++) {
    var alert_val = alertValList[i];
    if (!start && alerts[alert_val]) {
      deleteAlertPulse(alerts[alert_val]);
      alerts[alert_val] = undefined;
      return;
    }

    var alert_split = alert_val.split("#");
    var sel_cable = alert_split[1];
    var alert_pos = alert_split[2] * 1;
    var cableLength;

    if (sel_cable.indexOf("Cable") > -1) {
      var sel_cable_index = sel_cable.replaceAll("Cable-", "");
      $("#cable_list option").each((index, element) => {
        if ($(element).val() === "Cable-" + sel_cable_index) {
          cableLength = $(element).val().split("#")[1];
        }
      });
    } else {
      continue;
    }

    if (cableLength < alert_pos) {
      alert("Alert position can't over total length of cable")
      continue;
    }

    if (cableLength != undefined) {
      var selected_index = 0;

      let cableInfo;
      zoneGeoJson.features.forEach((feature, featureIndex) => {
        if (feature.properties.id && feature.properties.id === sel_cable) {
          cableInfo = zoneGeoJson.features[featureIndex].properties.calibration;
        }
      });

      if (!cableInfo) {
        continue;
      }

      if (cableInfo.length) {
        for (let i = 0; i < cableInfo.length; i++) {
          const element = cableInfo[i];
          if (alert_pos >= element.offset) {
            selected_index = i;
          }
        }

        if (selected_index < 0) {
          selected_index = 0;
        }
      }

      if (alerts[alert_val]) {
        continue;
      }

      var alert = showAlertPulse(
        cableInfo[selected_index].coordinates[0],
        cableInfo[selected_index].coordinates[1]
      );
      alerts[alert_val] = alert;
    }
  }
}

$(document).on("click", "#alertStart", null, function () {
  alertControl(true);
});

$(document).on("click", "#alertStop", null, function () {
  alertControl(false);
});

//* ******************** Create Cable ******************** *//
$(document).on("click", "#btn_add_cable", null, function () {
  // Data to draw on the map
  var $cableElem = $("#cable_list");

  var cableId = "Cable-" + $cableElem.val().split("#")[0];
  var cableLength = $cableElem.val().split("#")[1] * 1;

  if (cableLength === 0) {
    alert("Please select cable type!");
    return;
  }

  if (Object.values(selectedFeature).length === 0) {
    alert("Select a valid line first.");
    return;
  }

  if (selectedFeature.getGeometry().getType() !== "LineString") {
    alert("Sorry, Only LineStrings can assign as section.");
    return;
  }

  var coordinates = selectedFeature.getGeometry().getCoordinates();
  var calibration = [{
    offset: 0,
    coordinates: coordinates[0],
  },];
  calibration.push({
    offset: cableLength,
    coordinates: coordinates[coordinates.length - 1],
  });

  var currentCable = {
    type: "Feature",
    properties: {
      id: cableId,
      text: $("#cable_list option:selected").html(),
      calibration,
    },
    geometry: {
      type: "LineString",
      coordinates,
    },
  };

  var isAdded = zoneGeoJson.features.find(item => {
    return item.properties.id === currentCable.properties.id;
  });
  if (isAdded) {
    alert(`${currentCable.properties.text} Already Added`);
    return;
  }

  zoneGeoJson.features.push(currentCable);

  removeDrawingFromLayer(selectedFeature, getDrawingLayer().getSource());
  drawCable(currentCable);
});

//* ******************** Create Menu Scaling Handler ******************** *//
$(document).on("click", "#displayScaling", null, function () {
  var $dist = $("#distUnit");
  var $distance = $("#distance").val();
  var text = $distance + " " + $("#distUnit option:selected").html();

  if (!$distance) {
    alert("DISTANCE value is empty!");
    return false;
  }

  var selectedUnit = {
    type: "Feature",
    properties: {
      id: $distance,
      text: text,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [500, 900],
        [1300, 900],
      ],
    },
  };

  zoneGeoJson.features.push(selectedUnit);
  drawScaling(selectedUnit);

  $("#distance").val("");
});

//* ******************** Create Menu Click Handler ******************** *//
$(document).on("click", "#rectangle-click", null, function () {
  setDashSize(0);
  setShapeType("Box");
  addDrawAction();
  resetSideBar();
  $("#rectangle-click").parents("li:first").addClass("active");
});

$(document).on("click", "#square-click", null, function () {
  setDashSize(0);
  setShapeType("Square");
  addDrawAction();
  resetSideBar();
  $("#square-click").parents("li:first").addClass("active");
});

$(document).on("click", "#star-click", null, function () {
  setDashSize(0);
  setShapeType("Star");
  addDrawAction();
  resetSideBar();
  $("#star-click").parents("li:first").addClass("active");
});

$(document).on("click", "#line-click", null, function () {
  setDashSize(0);
  setShapeType("LineString");
  addDrawAction();
  resetSideBar();
  $("#line-click").parents("li:first").addClass("active");
});

$(document).on("click", "#dotted-click", null, function () {
  setDashSize(4);
  setShapeType("LineString");
  addDrawAction();
  resetSideBar();
  $("#dotted-click").parents("li:first").addClass("active");
});

$(document).on("click", "#polygon-click", null, function () {
  setDashSize(0);
  setShapeType("Polygon");
  addDrawAction();
  resetSideBar();
  $("#polygon-click").parents("li:first").addClass("active");
});

$(document).on("click", "#circle-click", null, function () {
  setDashSize(0);
  setShapeType("Circle");
  addDrawAction();
  resetSideBar();
  $("#circle-click").parents("li:first").addClass("active");
});

$(document).on("click", "#calibration-click", null, function () {
  addSelectAction();
  resetSideBar();
  isSelectCalibration = true;
  $("#calibration-click").parents("li:first").addClass("active");
});

$(document).on("click", "#none-click", null, function () {
  addSelectAction();
  resetSideBar();
  $("#none-click").parents("li:first").addClass("active");
});

//* ******************** Create for Delete and Move Event ******************** *//
$(document).on("click", "#translateFeature", null, function () {
  addTransformAction();
  resetSideBar();
  $("#translateFeature").parents("li:first").addClass("active");
});

$(document).on("click", "#btnDelete", null, function () {
  addTransformAction();
  $("ul.components li").removeClass("active");
  $("#translateFeature").parents("li:first").addClass("active");

  if (Object.values(selectedFeature).length) {
    var selectedZone = selectedFeature.getProperties();
    var newFeatures = [];
    var isSelected;
    //* Remove deleted item from zoneGeoJson feature list
    if (Object.values(selectedZone).length !== 0) {
      if (selectedZone.features) {
        isSelected = zoneGeoJson.features.find(function (item) {
          return (
            item.properties.text ===
            selectedZone.features[0].getProperties().text
          );
        });
      } else {
        isSelected = zoneGeoJson.features.find(function (item) {
          return item.properties.text === selectedZone.text;
        });
      }

      zoneGeoJson.features.map((feature, index) => {
        if (feature !== isSelected) {
          newFeatures.push(feature);
        }
      });

      zoneGeoJson.features = newFeatures;
    }

    if (isSelected && isSelected.properties && selectedZone.text) {
      removeLayersFromMap(getSelectedLayer(isSelected.properties));
    } else {
      if (selectedFeature && selectedFeature.getProperties().layer) {
        removeDrawingFromLayer(selectedFeature, getLayer(selectedFeature));
      }
      removeDrawingFromLayer(selectedFeature, getDrawingLayer().getSource());
    }

    initSelectedZone();
  } else {
    alert("Nothing to be deleted!")
  }
});

function getLayer(selectedFeature) {
  var layer_;
  var sameFeature = (comparer, comparee) => {
    return comparer === comparee ? true : false;
  };
  map.getLayers().forEach(function (layer) {
    var source = layer.getSource();
    if (source instanceof ol.source.Vector) {
      var features = source.getFeatures();
      if (features.length > 0) {
        features.forEach((feature) => {
          if (sameFeature(feature, selectedFeature)) {
            layer_ = layer;
          }
        });
      }
    }
  });

  return layer_ ? layer_.getSource() : null;
}

/*****select polygon***/
$("#colorPicker").change(function () {
  let userColor = $(this).val();

  $("#none-click").trigger("click");

  var fill = new ol.interaction.FillAttribute({}, {
    color: userColor
  });
  map.addInteraction(fill);
});

function getDrawingLayer() {
  var drawingLayer;
  map.getLayers().forEach(function (layer) {
    if (layer.getClassName() === "draw-layer") {
      drawingLayer = layer;
    }
  });

  return drawingLayer;
}

function getSelectedLayer(selectedZone) {
  var selectedLayer = [];

  if (map.getLayers().getLength() > 2) {
    for (let i = 2; i < map.getLayers().getLength(); i++) {
      var layer = map.getLayers().getArray()[i];
      var features = layer.getSource().getFeatures();

      for (var feature of features) {
        if (
          feature.getProperties().text &&
          feature.getProperties().text === selectedZone.text
        ) {
          selectedLayer.push(layer);
        }
      }
    }
  }

  return selectedLayer;
}

function removeDrawingFromLayer(feature, layer) {
  if (layer) {
    layer.removeFeature(feature);
  }
}

function removeLayersFromMap(layers) {
  layers.forEach((layer) => {
    map.removeLayer(layer);
  });
}

function drawZone(zone) {
  initSelectedZone();
  var geojsonObject = {};

  if (zone.type.toLowerCase() === "feature") {
    geojsonObject = {
      type: "FeatureCollection",
      features: [zone],
    };
  }
  if (zone.type.toLowerCase() === "featurecollection") {
    geojsonObject = zone;
  }

  var features = new ol.format.GeoJSON().readFeatures(geojsonObject);
  // New vector layer
  var vector = new ol.layer.Vector({
    source: new ol.source.Vector({
      features,
      wrapX: false,
    }),
    style: function (feature) {
      return [
        new ol.style.Style({
          image: new ol.style.RegularShape({
            fill: new ol.style.Fill({
              color: "#6f50fd06"
            }),
            stroke: new ol.style.Stroke({
              color: "#109eff",
              width: 2
            }),
            radius: 10,
            points: 3,
            angle: feature.get("angle") || 0,
          }),
          fill: new ol.style.Fill({
            color: "#6f50fd90"
          }),
          stroke: new ol.style.Stroke({
            color: "#6f50fd",
            width: 3
          }),
          text: new ol.style.Text({
            text: feature.get("text"),
            scale: 1.3,
            offsetY: 15,
            fill: new ol.style.Fill({
              color: "green",
            }),
            stroke: new ol.style.Stroke({
              color: "#FFFF99",
              width: 3,
            }),
          }),
        }),
      ];
    },
    title: "zoneLayer",
  });

  map.addLayer(vector);
}

function drawCable(currentCable) {
  initSelectedZone();
  var coordinates = currentCable.geometry.coordinates;

  var lineStringFeatures = new ol.Collection();
  lineStringFeatures.push(
    new ol.Feature({
      geometry: new ol.geom.LineString(coordinates),
      text: currentCable.properties.text,
      id: currentCable.properties.id,
    })
  );

  var lineStringVector = new ol.layer.Vector({
    name: "section-layer",
    source: new ol.source.Vector({
      features: lineStringFeatures,
    }),
    title: currentCable.properties.id,
    style: function (f) {
      var opt = {
        tension: Number($("#tension").val()),
        pointsPerSeg: 2,
        normalize: $("#normalize").prop("checked"),
      };
      var csp = f.getGeometry().cspline(opt);
      return [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "#557ef8",
            width: 6
          }),
          geometry: $("#cspline").prop("#557ef8") ? csp : null,
          text: new ol.style.Text({
            text: currentCable.properties.text,
            overflow: true,
            offsetY: 15,
            scale: 1.3,
            fill: new ol.style.Fill({
              color: "green",
            }),
            stroke: new ol.style.Stroke({
              color: "#FFFF99",
              width: 3,
            }),
          }),
        }),
      ];
    },
  });

  map.addLayer(lineStringVector);

  var points = currentCable.properties.calibration;
  var pointsCoordinates = [];
  var calibrationCoordinates = [];
  points && points.map((point, index) => {
    if (index === 0 || index === points.length - 1) {
      pointsCoordinates.push(point.coordinates);
    } else {
      calibrationCoordinates.push({ coordinates: point.coordinates, value: point.offset });
    }
  });

  calibrationCoordinates.map(coordinate => {
    const calibrationPoint = new ol.Feature({
      geometry: new ol.geom.Point(calibration.coordinates),
      text: "calibration",
      layer: currentCable.properties.id,
      value: calibration.value,
    });
    calibrationPoint.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          stroke: new ol.style.Stroke({
            color: "#f26552",
            width: 10
          }),
          radius: 8,
        }),
      })
    );

    lineStringVector.getSource().addFeatures([calibrationPoint])
  })

  var multiPointFeatures = new ol.Collection();
  multiPointFeatures.push(
    new ol.Feature({
      geometry: new ol.geom.MultiPoint(pointsCoordinates),
      text: currentCable.properties.text,
      id: currentCable.properties.id,
    })
  );

  var multiPointVector = new ol.layer.Vector({
    name: "section-layer",
    source: new ol.source.Vector({
      features: multiPointFeatures
    }),
    title: currentCable.properties.id,
    style: function (f) {
      return [
        new ol.style.Style({
          image: new ol.style.Circle({
            stroke: new ol.style.Stroke({
              color: "#557ef8",
              width: 5
            }),
            radius: 3,
          }),
        }),
      ];
    },
  });

  map.addLayer(multiPointVector);

  var totalFeatures = new ol.Collection();
  lineStringFeatures.forEach((feature) => {
    totalFeatures.push(feature);
  });
  multiPointFeatures.forEach((feature) => {
    totalFeatures.push(feature);
  });

  addModifyAction(totalFeatures);
}

function addModifyAction(features) {
  modify = new ol.interaction.Modify({
    features,
    pixelTolerance: 1,
    deleteCondition: (evt) => {
      return false;
    },
    insertVertexCondition: (event) => {
      if (isSelectCalibration) {
        const coordinates = map.getEventPixel(event.originalEvent);
        const realCoordinate = event.coordinate
        const layerTitle = map.forEachFeatureAtPixel(coordinates, (feature, layer) => {
          if (layer && layer.get("title") && layer.get("title").indexOf("Cable") > -1) {
            return layer.get("title")
          }
        })
        const layers = event.target.getLayers().getArray();
        layers.forEach((layer) => {
          if (
            layer.getProperties().name === "section-layer" &&
            layer.getSource().getFeatures()[0].getGeometry().getType() ===
            "MultiPoint" && layer.get("title") && layer.get("title") === layerTitle
          ) {
            const layerSource = layer.getSource();

            const calibrationPoint = new ol.Feature({
              geometry: new ol.geom.Point(realCoordinate),
              text: "calibration",
              layer: layerTitle,
            });
            calibrationPoint.setStyle(
              new ol.style.Style({
                image: new ol.style.Circle({
                  stroke: new ol.style.Stroke({
                    color: "#f26552",
                    width: 10
                  }),
                  radius: 8,
                }),
              })
            );
            layerSource.addFeatures([calibrationPoint]);
          }
        });

        return false;
      }
    },
  });

  modify.on("modifyend", (event) => {
    event.stopPropagation();

    var featureText = features.getArray()[1].getProperties().id;
    zoneGeoJson.features.map((feature, featureIndex) => {
      if (feature.properties.id === featureText) {
        features
          .getArray()[1]
          .getGeometry()
          .getCoordinates()
          .forEach((item, index) => {
            return (zoneGeoJson.features[featureIndex].properties.calibration[
              index
            ].coordinates = item);
          });
      }
    });
  });
  modify.on();
  map.addInteraction(modify);
}

function drawScaling(selectedUnit) {
  initSelectedZone();
  let coordinates = selectedUnit.geometry.coordinates;
  // Data to draw on the map
  var features = new ol.Collection();
  features.push(
    new ol.Feature({
      geometry: new ol.geom.LineString(coordinates),
      text: selectedUnit.properties.text,
      id: selectedUnit.properties.id,
    })
  );

  var vector = new ol.layer.Vector({
    name: "addDottedLinesLayers",
    source: new ol.source.Vector({
      features: features
    }),
    style: function (f) {
      return [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "green",
            width: 3
          }),
          text: new ol.style.Text({
            text: selectedUnit.properties.text,
            offsetY: -10,
            scale: 1.5,
            fill: new ol.style.Fill({
              color: "green",
            }),
            stroke: new ol.style.Stroke({
              color: "green",
              width: 0.5,
            }),
          }),
        }),
      ];
    },
  });
  map.addLayer(vector);

  var mod = new ol.interaction.Modify({
    features: features,
    deleteCondition: (evt) => {
      return false;
    },
    insertVertexCondition: (e) => {
      return false;
    },
  });
  map.addInteraction(mod);
}


function generateFeaturesInGeoJson(zoneGeoJson) {
  let featureList = zoneGeoJson.features;

  featureList.forEach((feature) => {
    let featureLevel = feature.type;

    if (featureLevel === "Feature") {
      if (feature.properties.id.indexOf("Zone") !== -1) {
        drawZone(feature);
      } else if (
        feature.properties.text.indexOf("Feet") !== -1 ||
        feature.properties.text.indexOf("Meter") !== -1
      ) {
        drawScaling(feature);
      } else {
        drawCable(feature);
      }
    } else if (featureLevel === "Drawing") { } else {
      alert("File is broken! Please upload right geojson file!");
    }
  });
}

function getDrawingFeatureList(drawingList) {
  let featureList = [];
  drawingList.forEach((drawing) => {
    let feature;

    switch (drawing.geometry.type) {
      case "Polygon":
        feature = new ol.Feature({
          geometry: new ol.geom.Polygon(drawing.geometry.coordinates),
        });
        featureList.push(feature);
        break;
      case "Circle":
        const [center, radius] = drawing.geometry.coordinates;
        feature = new ol.Feature({
          geometry: new ol.geom.Circle(center, radius),
        });
        featureList.push(feature);
        break;
      case "LineString":
        feature = new ol.Feature({
          geometry: new ol.geom.LineString(drawing.geometry.coordinates),
        });
        featureList.push(feature);
        break;
      default:
        break;
    }
  });

  return featureList;
}

function addDrawAction() {
  var shape = getShapeType();

  if (shape === "None") {
    return;
  }

  actionOnMap = changeActionAs("Draw", shape);
  setActionOnMap(actionOnMap);
}

function getLineStringForCable(sourceFeature) {
  const sourceCableText = sourceFeature.getProperties().text;
  map.getLayers().forEach((layer) => {
    if (layer.getSource() instanceof ol.source.Vector) {
      let features = source.getFeatures();
      if (features.length) {
        features.forEach((feature) => {
          if (
            feature &&
            feature !== sourceFeature &&
            feature.getProperties().text === sourceCableText &&
            feature.getGeometry().getType() === "LineString"
          ) {
            return feature;
          }
        });
      }
    }
  });

  return null;
}

function syncWith(event) {
  const eventType = event.type;
  const delta = event.delta;
  const sourceFeature = event.feature;
  const geometry = sourceFeature.getGeometry();
  const geoType = geometry.getType();
  const coordinates = sourceFeature.getGeometry().getCoordinates();
  const featureText = sourceFeature.getProperties().id;

  if (eventType === "translating" && coordinates && geoType === "LineString") {
    if (map.getLayers().getLength() > 2) {
      for (let i = 2; i < map.getLayers().getLength(); i++) {
        const layer = map.getLayers().getArray()[i];
        const features = layer.getSource().getFeatures();

        for (const feature of features) {
          if (
            feature.getProperties().id &&
            feature.getProperties().id === featureText &&
            sourceFeature !== feature
          ) {
            const oldPoints = feature.getGeometry().getCoordinates();

            let newPoints = [];
            oldPoints.forEach((point) => {
              newPoints.push([point[0] + delta[0], point[1] + delta[1]]);
            });

            feature.getGeometry().setCoordinates(newPoints);

            zoneGeoJson.features.map((zoneFeature, featureIndex) => {
              if (zoneFeature.properties.id === featureText) {
                newPoints.forEach((item, index) => {
                  return (zoneGeoJson.features[
                    featureIndex
                  ].properties.calibration[index].coordinates =
                    newPoints[index]);
                });
              }
            });
          }
        }
      }
    }
  }
}

function addTransformAction() {
  actionOnMap = changeActionAs("Transform");
  actionOnMap.on("select", (event) => {
    let property;

    if (!event.feature) {
      return;
    }

    if (event.feature.getProperties().features) {
      property = event.feature.getProperties().features[0].getProperties();
    } else {
      property = event.feature.getProperties();
    }

    if (property.text && property.text.indexOf("Cable") > -1) {
      addTransformNonScaleAction();
    }
  });

  setActionOnMap(actionOnMap);
}

function addTransformNonScaleAction() {
  actionOnMap = changeActionAs("Transform-nonScale");
  actionOnMap.on("select", (event) => {
    let property;

    if (!event.feature) {
      return;
    }

    if (event.feature && event.feature.getProperties().features) {
      property = event.feature.getProperties().features[0].getProperties();
    } else {
      property = event.feature.getProperties();
    }

    if (property.text && property.text.indexOf("Zone") > -1) {
      addTransformAction();
    }
  });
  actionOnMap.on("translateend", (event) => {
    syncWith(event);
  });
  actionOnMap.on("rotating", (event) => {
    syncWith(event);
  });
  actionOnMap.on("translating", (event) => {
    syncWith(event);
  });
  actionOnMap.on("scaling", (event) => {
    syncWith(event);
  });

  setActionOnMap(actionOnMap);
}

function onCalibrationSave() {
  const offset = $("#calibrationInfo").val();
  let maxValue;

  if (!offset) {
    return;
  }

  let duplicated = false;
  zoneGeoJson.features.forEach((feature, featureIndex) => {
    if (feature.properties.id === selectedFeature.getProperties().layer) {
      zoneGeoJson.features[featureIndex].properties.calibration.forEach(
        (item, index) => {
          if (item.offset === offset) {
            duplicated = true
            alert("That offset value is exist")
          }
        }
      );

      if (!duplicated) {
        const calibrationArray =
          zoneGeoJson.features[featureIndex].properties.calibration;
        maxValue = calibrationArray[calibrationArray.length - 1];
      }
    }
  });

  if (duplicated) {
    return
  }

  if (offset >= maxValue.offset) {
    alert("Calibration value can't have value over endpoint");
    return;
  }

  zoneGeoJson.features.forEach((feature, featureIndex) => {
    if (feature.properties.id === selectedFeature.getProperties().layer) {
      zoneGeoJson.features[featureIndex].properties.calibration.push({
        offset: parseInt(offset),
        coordinates: selectedFeature.getGeometry().getCoordinates(),
      });
      zoneGeoJson.features[featureIndex].properties.calibration.sort(
        (a, b) => a.offset - b.offset
      );
    }
  });

  const oldProperties = selectedFeature.getProperties();
  selectedFeature.setProperties({
    ...oldProperties,
    value: offset
  });

  overlay.setPosition(undefined);
}

function onCalibrationDelete() {
  const offset = $("#calibrationInfo").val() * 1;
  let newCalibration = [];
  zoneGeoJson.features.forEach((feature, featureIndex) => {
    if (feature.properties.id === selectedFeature.getProperties().layer) {
      zoneGeoJson.features[featureIndex].properties.calibration.forEach(
        (item, index) => {
          if (item.offset !== offset) {
            newCalibration.push(item);
          }
        }
      );
      zoneGeoJson.features[featureIndex].properties.calibration = newCalibration
      zoneGeoJson.features[featureIndex].properties.calibration.sort(
        (a, b) => a.offset - b.offset
      );
    }
  });

  overlay.setPosition(undefined);
  $("#btnDelete").trigger("click");
}

function showCalibrationTooltip(feature) {
  map.addOverlay(overlay);
  if (selectedFeature) {
    if (selectedFeature.getProperties().value) {
      $("#calibrationInfo").val(selectedFeature.getProperties().value);
    } else {
      $("#calibrationInfo").val("");
    }
  }
  overlay.setPosition(feature.getGeometry().getCoordinates());
}

function addSelectAction() {
  actionOnMap = changeActionAs("Select");
  actionOnMap.on("select", function (event) {
    event.selected.forEach((each) => {
      selectedFeature = each;
      if (each.getProperties().text === "calibration") {
        showCalibrationTooltip(each);
        return;
      }
      each.setStyle(
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "#f26552",
            width: 3
          }),
          text: new ol.style.Text({
            text: each.getProperties().text,
            offsetY: 15,
            scale: 1.3,
            fill: new ol.style.Fill({
              color: "#f26552",
            }),
            stroke: new ol.style.Stroke({
              color: "#f26552",
            }),
          }),
          fill: new ol.style.Fill({
            color: "#f2655250"
          }),
          image: new ol.style.Circle({
            stroke: new ol.style.Stroke({
              color: "#f26552",
              width: 6
            }),
            radius: 3,
          }),
        })
      );
    });

    return;
  });
  actionOnMap.on("deselect", function (event) {
    event.deselected.forEach((each) => {
      if (selectedFeature.getGeometry().text === "calibration") {
        each.setStyle(
          new ol.style.Style({
            image: new ol.style.Circle({
              stroke: new ol.style.Stroke({
                color: "#f26552",
                width: 6
              }),
              radius: 3,
            }),
          })
        ); // more likely you want to restore the original style
      }
      each.setStyle(null); // more likely you want to restore the original style
    });
  });

  setActionOnMap(actionOnMap);
}

function changeActionAs(actionType, shape = "None") {
  map.removeInteraction(actionOnMap);
  if (actionOnMap) {
    actionOnMap = undefined;
  }

  if (actionType !== "Draw") {
    initShapeType();
  }

  var newAction;
  switch (actionType) {
    case "Select":
      newAction = new ol.interaction.Select({
        filter: function (layer) {
          return !isSelectCalibration;
        },
      });
      break;
    case "Draw":
      newAction = new ol.interaction.Draw({
        source: source,
        type: getGeometryFunction(shape)[0],
        geometryFunction: getGeometryFunction(shape)[1],
      });
      break;
    case "Transform":
      newAction = new ol.interaction.Transform({
        enableRotatedTransform: false,
        addCondition: ol.events.condition.shiftKeyOnly,
        hitTolerance: 1,
        scale: true,
        stretch: false,
        translate: true,
        rotate: false,
      });
      break;
    case "Transform-nonScale":
      newAction = new ol.interaction.Transform({
        enableRotatedTransform: false,
        addCondition: ol.events.condition.shiftKeyOnly,
        hitTolerance: 1,
        scale: false,
        stretch: false,
        translate: true,
        rotate: false,
      });
      break;
    default:
      break;
  }

  return newAction;
}

function setActionOnMap(action) {
  map.addInteraction(action);
}

function getGeometryFunction(geometryType) {
  var type = geometryType;
  var geometryFunction = undefined;

  if (type === "Square") {
    type = "Circle";
    geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
  } else if (type === "Box") {
    type = "Circle";
    geometryFunction = ol.interaction.Draw.createBox();
  } else if (type === "Star") {
    type = "Circle";
    geometryFunction = function (coordinates, geometry) {
      var center = coordinates[0];
      var last = coordinates[coordinates.length - 1];
      var dx = center[0] - last[0];
      var dy = center[1] - last[1];
      var radius = Math.sqrt(dx * dx + dy * dy);
      var rotation = Math.atan2(dy, dx);
      var newCoordinates = [];
      var numPoints = 12;

      for (var i = 0; i < numPoints; ++i) {
        var angle = rotation + (i * 2 * Math.PI) / numPoints;
        var fraction = i % 2 === 0 ? 1 : 0.5;
        var offsetX = radius * fraction * Math.cos(angle);
        var offsetY = radius * fraction * Math.sin(angle);
        newCoordinates.push([center[0] + offsetX, center[1] + offsetY]);
      }
      newCoordinates.push(newCoordinates[0].slice());
      if (!geometry) {
        geometry = new ol.geom.Polygon([newCoordinates]);
      } else {
        geometry.setCoordinates([newCoordinates]);
      }
      return geometry;
    };
  }

  return [type, geometryFunction];
}

//* ******************** Create Zone ******************** *//
$(document).on("click", "#btn_add_zone", null, function () {
  var $zoneElem = $("#zone_list");
  if ($zoneElem.val() * 1 === 0) {
    alert("Please select zone type!");
    return;
  }
  if (Object.values(selectedFeature).length === 0) {
    alert("Select a valid zone first.");
    return;
  }
  if (selectedFeature.getGeometry().getType() === "Circle") {
    alert("Sorry. Circles cannot assign as Zone");
    return;
  }
  if (selectedFeature.getGeometry().getType() === "Line") {
    alert("Sorry. Lines cannot assign as Zone");
    return;
  }
  if (selectedFeature.getGeometry().getType() === "MultiPolygon") {
    alert("Sorry. MultiPolygon cannot assign as Zone");
    return;
  }
  var selectedZone = {
    type: "Feature",
    properties: {
      id: "Zone-" + $zoneElem.val(),
      text: $("#zone_list option:selected").html(),
    },
    geometry: {
      type: "Polygon",
      coordinates: selectedFeature.getGeometry().getCoordinates(),
    },
  };

  var isAdded = zoneGeoJson.features.find(function (item) {
    return item.properties.id === selectedZone.properties.id;
  });

  if (isAdded) {
    alert(`${selectedZone.properties.text} Already Added`);
    return;
  }

  zoneGeoJson.features.push(selectedZone);

  removeDrawingFromLayer(selectedFeature, getDrawingLayer().getSource());
  drawZone(selectedZone);

  $("#translateFeature").trigger("click");
});


function resetSideBar() {
  initSelectedZone();
  isSelectCalibration = false;
  $(".app-sidebar-components li").removeClass("active");
}

function showAlertPulse(xPos, yPos) {
  let node = createAlertDot();
  let alert = new ol.Overlay({
    element: node,
  });

  map.addOverlay(alert);
  alert.setPosition([xPos, yPos]);

  return alert;
}

function deleteAlertPulse(alert) {
  alert.setPosition(undefined);
}

function createAlertDot() {
  let node = document.createElement("div");
  let attr = document.createAttribute("class");
  attr.value = "pulse-alert";
  node.setAttributeNode(attr);

  document.getElementById("alert").appendChild(node);

  return node;
}


function updateGeoJson() {
  tempZoneGeoJson = {
    type: "FeatureCollection",
    features: [],
    image: imageName,
  };

  const generateFeatureJson = (level, id, text, type, coordinates) => {
    return {
      type: level,
      properties: {
        id,
        text
      },
      geometry: {
        type,
        coordinates
      },
    };
  };

  const generateFeatureJsonWithCalibration = (level, id, text, calibration, type, coordinates) => {
    return {
      type: level,
      properties: {
        id,
        text,
        calibration
      },
      geometry: {
        type,
        coordinates
      },
    };
  };

  var tempCalibration = {};

  zoneGeoJson.features.forEach((feature, featureIndex) => {
    var temp_key = feature.properties.id;
    if (temp_key && temp_key.indexOf("Cable") > -1) {
      tempCalibration[temp_key] = feature.properties.calibration;
    }
  });

  var layerNameList = [];
  map.getLayers().forEach((layer) => {
    let source = layer.getSource();
    if (source instanceof ol.source.Vector) {
      let features = source.getFeatures();
      if (features.length) {
        features.forEach((feature) => {
          const featureGeometry = feature.getGeometry();
          const featureProperties = feature.getProperties();
          let featureLevel;
          let featureId;
          let featureText;
          let featureType;
          let featureCoordinates;

          if (featureGeometry) {
            featureType = featureGeometry.getType();
            if (featureGeometry.getCoordinates()) {
              featureCoordinates = featureGeometry.getCoordinates();
            } else {
              featureCoordinates = [
                featureGeometry.getCenter(),
                featureGeometry.getRadius(),
              ];
            }
          } else {
            return;
          }

          if (featureProperties) {
            featureId = featureProperties.id;
            featureText = featureProperties.text;

            if (featureText == "calibration") return;

            if (featureId || featureText) {
              featureLevel = "Feature";
            } else {
              featureLevel = "Drawing";
            }
          } else {
            return;
          }

          if (!layerNameList.includes(featureText)) {
            if (featureText) {
              layerNameList.push(featureText);
            }
            tempZoneGeoJson.features.push(
              featureId && featureId.indexOf("Cable") > -1 ?
                generateFeatureJsonWithCalibration(
                  featureLevel,
                  featureId,
                  featureText,
                  tempCalibration[featureId],
                  featureType,
                  featureCoordinates
                ) :
                generateFeatureJson(
                  featureLevel,
                  featureId,
                  featureText,
                  featureType,
                  featureCoordinates
                )
            );
          }
        });
      }
    }
  });
  addedCable = []
  tempZoneGeoJson.features.map(feature => {
    const featureProperties = feature.properties;
    if (featureProperties && featureProperties.id && featureProperties.id.indexOf("Cable") > -1) {
      addedCable.push(featureProperties.id)
    }
  })
  zoneGeoJson = tempZoneGeoJson
}

$(document).on("click", "#btnSave", null, function (e) {
  updateGeoJson();
  let usedCables = "";
  addedCable.map((cableId, index) => {
    if (index === addedCable.length - 1) {
      usedCables += cableId
    } else {
      usedCables += cableId + ","
    }
  })

  let isZoneCreated = false;

  for (let i = 0; i < zoneGeoJson.features.length; i++) {
    const feature = zoneGeoJson.features[i];
    if (
      feature.properties &&
      feature.properties.id &&
      feature.properties.id.indexOf("Zone") > -1
    ) {
      isZoneCreated = true;
    }
  }

  // * Ajax call to localhost. Address is changeable
  if (!isZoneCreated) {
    alert("No zone selected!");
    return
  }

  $.post("http://10.10.10.11", { data: JSON.stringify({ ...zoneGeoJson, "File Name": $("#txtfnam").val(), "All Cable Id": `${usedCables}` }) })
    .done(function (data) {
      alert("GeoJson file has successfully transferred");
    })
    .fail(function (err) {
      alert("Sorry, there is an error");
    });
});

function init(
  geoJson = null,
  imageFileName = tempImageName,
  updateMap = false
) {
  imageName = imageFileName;
  imageUrl = imageAssetUrl + imageName;

  let layers;

  if (map) {
    map = undefined;
  }

  initMap();

  if (geoJson) {
    let drawingList = [];
    geoJson.features.forEach((feature) => {
      if (feature.type === "Drawing") {
        drawingList.push(feature);
      }
    });

    if (drawingList.length) {
      source.addFeatures(getDrawingFeatureList(drawingList));
    }

    zoneGeoJson = geoJson;
    generateFeaturesInGeoJson(zoneGeoJson);
  }

  function initMap() {
    if (!geoJson) {
      source = new ol.source.Vector({
        wrapX: false,
        title: "source"
      });
    }

    var projection = new ol.proj.Projection({
      code: "xkcd-image",
      units: "pixels",
      extent: extent,
    });

    const resolution = window.screen.width
    let zoomValue;
    if (resolution > 1440) {
      zoomValue = 2
    } else if (resolution <= 1440 && resolution > 1024) {
      zoomValue = 1.5
    } else if (resolution <= 1024 && resolution >= 768) {
      zoomValue = 1.0
    } else if (resolution < 768 && resolution >= 425) {
      zoomValue = 0.5
    } else {
      zoomValue = 0
    }

    view = new ol.View({
      projection: projection,
      center: ol.extent.getCenter(extent),
      zoom: zoomValue,
      maxZoom: 5,
    });

    var imgLayer = new ol.layer.Image({
      source: new ol.source.ImageStatic({
        attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
        url: imageUrl,
        projection: projection,
        imageExtent: extent,
      }),
    });

    vector = new ol.layer.Vector({
      className: "draw-layer",
      source: source,
      title: "default",
      zIndex: 1000,
      style: (f) => {
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: 5,
            stroke: new ol.style.Stroke({
              width: 1.5,
              color: f.get("color") || [255, 128, 0],
            }),
            fill: new ol.style.Fill({
              color: (f.get("color") || [255, 128, 0]).concat([0.3]),
            }),
          }),
          fill: new ol.style.Fill({
            color: f.get("color") || "rgba(255, 255, 255, 0.2)",
          }),
          stroke: new ol.style.Stroke({
            width: 2,
            lineDash: [isDashLine],
            color: f.get("color") || [255, 128, 0],
          }),
        });
      },
    });

    if (map) {
      map = undefined;
    }
    map = new ol.Map({
      layers: [imgLayer, vector],
      target: "map",
      interactions: ol.interaction.defaults({
        dragPan: lock,
      }),
      loadTilesWhileAnimating: true,
      view: view,
    });

    if (modify) {
      map.removeInteraction(modify)
    }
  }

  // Event Handler when hover
  map.addOverlay(tooltip);
  map.on("pointermove", function (evt) {
    var featureText = "";
    var coordinates;
    var hit = this.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
      var selectedZone = feature.getProperties();
      if (
        selectedZone.features != undefined &&
        selectedZone.features.length &&
        selectedZone.features[0].getProperties() != undefined &&
        selectedZone.features[0].getProperties().id != undefined &&
        selectedZone.features[0].getProperties().id.indexOf("Cable") > -1
      ) {
        featureText = selectedZone.features[0].getProperties().id;
        coordinates = feature.getGeometry().getCoordinates();
        return true;
      } else {
        return false;
      }
    });

    let calibrations = [];
    (() => {
      const features = zoneGeoJson.features;
      features.map((feature) => {
        if (
          feature.type === "Feature" &&
          feature.geometry.type === "LineString" &&
          feature.properties.id === featureText
        ) {
          calibrations = feature.properties.calibration;
        }
      });
    })();

    if (hit && calibrations.length) {
      let tooltipInfoArray = [];
      calibrations.map((element, elementIndex) => {
        var isSame = true;
        element.coordinates.map((coordinateItem, index) => {
          if (coordinateItem.toFixed(0) !== coordinates[index].toFixed(0)) {
            isSame = false;
          }
        });

        if (isSame && tooltipInfoArray.length === 0) {
          tooltipInfoArray = [elementIndex, element];
        }
      });

      if (tooltipInfoArray.length !== 0) {
        const calibration = tooltipInfoArray[1];
        tooltipContent.innerHTML =
          "<p>" + calibration.offset.toFixed(0).toString() + "</p>";
        tooltip.setPosition(calibration.coordinates);
      }
    } else {
      tooltip.setPosition(undefined);
    }
  });
}

zoneGeoJson = JSON.parse($('#txtgeojson').val())
setTimeout(() => {
  removeDivs();
  init(zoneGeoJson, zoneGeoJson.image, true)
  alertControl(true)
}, 1000)
