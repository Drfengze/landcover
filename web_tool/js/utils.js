var findClassByName = function(name){
    for(var i=0; i<CLASSES.length; i++){
        if(CLASSES[i]["name"] == name){
            return i;
        }
    }
    return null;
};

var findClassByIdx = function(idx){
    return CLASSES[idx]["name"];
}

var renderClassCount = function(name, count){
    $(".radClasses[value='"+name+"']").siblings(".classCounts").html(count);
}

var updateClassColor = function(obj){
    var classIdx = $(obj.targetElement).attr("data-class-idx");
    CLASSES[classIdx]["color"] = '#' + obj;
};

var getRandomColor = function(){
    // From https://stackoverflow.com/questions/1484506/random-color-generator
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

var getRandomString = function(length=8){
    let alphabet = "abcdefghijklmnopqrstuvwxyz1234567890";
    let str = "";
    for(let i=0; i<length; i++){
        str += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return str;
}

var animateSuccessfulCorrection = function(countdown, time){
    gAnimating = true;
    gSelectionBox.setStyle({weight:countdown})
    if(countdown > 2){
        window.setTimeout(function(){animateSuccessfulCorrection(countdown-1);}, time);
    }else{
        gAnimating = false;
    }
}

var notifySuccess = function(data, textStatus, jqXHR, timeout=500){
    var resp = data;
    var respType = 'success';

    if(!resp.success){
        respType = 'error'
    }
    new Noty({
        type: respType,
        text: resp.message,
        layout: 'topCenter',
        timeout: timeout,
        theme: 'metroui'
    }).show();        
};

var notifySuccessMessage = function(message, timeout=2000){
    new Noty({
        type: 'success',
        text: message,
        layout: 'topCenter',
        timeout: timeout,
        theme: 'metroui'
    }).show();        
};

var notifyFail = function(jqXHR, textStatus, errorThrown, timeout=2000){
    var response = $.parseJSON(jqXHR.responseText);
    console.log("Error in processing server: " + response.error);
    new Noty({
        type: "error",
        text: "Error in processing server: " + response.error,
        layout: 'topCenter',
        timeout: timeout,
        theme: 'metroui'
    }).show();
};

var notifyFailMessage = function(message, timeout=2000){
    new Noty({
        type: "error",
        text: message,
        layout: 'topCenter',
        timeout: timeout,
        theme: 'metroui'
    }).show();
};

var isPointInsidePolygon = function(latlng, poly) {
    // From https://stackoverflow.com/questions/31790344/determine-if-a-point-reside-inside-a-leaflet-polygon
    var polyPoints = poly.getLatLngs()[0];
    var x = latlng.lat, y = latlng.lng;
    
    var inside = false;
    for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
        var xi = polyPoints[i].lat, yi = polyPoints[i].lng;
        var xj = polyPoints[j].lat, yj = polyPoints[j].lng;

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

var getPolyAround = function(latlng, radius, fromCenter, round=false){
    // We convert the input lat/lon into the EPSG3857 projection, define our square, then re-convert to lat/lon 
    var latlngProjected = L.CRS.EPSG3857.project(latlng);

    var x = latlngProjected.x;
    var y = latlngProjected.y;
    
    var resolution = DATASETS[gCurrentDataset]["dataLayer"]["resolution"];
    if(round){
        x = Math.round(x/resolution) * resolution;
        y = Math.round(y/resolution) * resolution;
    }

    if(fromCenter){
        var top = y + radius/2;
        var bottom = y - radius/2;
        var left = x - radius/2;
        var right = x + radius/2;
    }else{
        var top = y;
        var bottom = y - radius;
        var left = x;
        var right = x + radius;
    }
    
    // left/right are "x" points while top/bottom are the "y" points
    var topleft = L.CRS.EPSG3857.unproject(L.point(left, top));
    var bottomright = L.CRS.EPSG3857.unproject(L.point(right, bottom));
    
    return [[topleft.lat, topleft.lng],
            [topleft.lat, bottomright.lng],
            [bottomright.lat, bottomright.lng],
            [bottomright.lat, topleft.lng]];
};

var padNumberWithZeros = function(n, width, z) {
    /* From https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
    
    Example:
    padNumberWithZeros(10, 4) --> "0010"
    padNumberWithZeros(9, 4) --> "0009"
    padNumberWithZeros(10, 4, '-') --> "--10"
    */
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var runUserStudyTimer = function(timeRemaining){
    if(timeRemaining > 0){
        var minutes = Math.floor(timeRemaining / 60)
        var seconds = timeRemaining % 60;
        $("#timer").html(padNumberWithZeros(minutes,2)+":"+padNumberWithZeros(seconds,2));
        window.setTimeout(function(){runUserStudyTimer(timeRemaining-1)}, 1000);
    } else{
        $("#timer").html("00:00");
        $("body").append("<div class='endOfTrial'> Thanks for labeling! Please move on to the next trial. </div>");
        $("body").append("<div class='endOfTrialMask'></div>");
    }
}

var setupTrainingSets = function(i){

    var url = null;
    if(i==0){
        url = "data/demo_set_1_boundary.geojson"
    }else{
        url = "data/training_set_"+(i)+"_boundary.geojson"
    }

    trainingSetBoundaries[i].addTo(map);
    $.ajax({
        dataType: "json",
        url: url,
        success: function(data) {
            $(data.features).each(function(key, data) {
                trainingSetBoundaries[i].addData(data);
            });
            trainingSetBoundaries[i].setStyle({
                "color": "#ff7800",
                "weight": 4,
                "fill": false
            })
        }
    });
};

var getURLArguments = function(){
    var url = new URL(window.location.href);
    var trainingSetID = url.searchParams.get("trainingSetID");
    var userID = url.searchParams.get("userID");
    var modelID = url.searchParams.get("modelID");
    var maxTime = url.searchParams.get("maxTime");
    var backendID = url.searchParams.get("backendID");
    var dataset = url.searchParams.get("dataset");
    var cachedModel = url.searchParams.get("cachedModel");

    var model = url.searchParams.get("model");

    /// trainingSetID will override dataset
    if(trainingSetID === null){
        trainingSetID = 0;
        //dataset = "demo_set_1";
    } else{
        trainingSetID = parseInt(trainingSetID);
        //dataset = "user_study_" + trainingSetID;
    }

    if(userID === null) userID = "test";
    if(maxTime !== null){
        maxTime = parseInt(maxTime);
    }

    if(backendID === null){
        backendID = 0;
    } else{
        backendID = parseInt(backendID);
    }

    if(modelID === null){
        if(backendID >= 1 && backendID <= 8){ modelID = "1"}
        if(backendID >= 9 && backendID <= 16){ modelID = "2"}
    }

    return {
        url: url,
        trainingSetID: trainingSetID,
        userID: userID,
        modelID: modelID,
        maxTime: maxTime,
        backendID: backendID,
        cachedModel: cachedModel,
        dataset: dataset,
        model: model
    }
}

var generateRandInt = function() {
    return Math.floor( Math.random() * 200000 ) + 1;
};

var getZoneMap = function(zoneSetId, name, url){
    $.ajax({
        dataType: "json",
        url: url,
        success: function(data) {
            for(k in data.features){
                data.features[k].properties["KEY"] = DATASETS[gCurrentDataset]["shapeLayers"][zoneSetId]["zoneNameKey"];
            }
            gZonemaps[name].addData(data);
        }
    });
}

var forEachFeatureOnClick = function(feature, layer) {
    console.debug("clicked")
    layer.on('click', function (e) {
        gCurrentZone = layer;
        for(k in gZonemaps){
            gZonemaps[k].setStyle(DEFAULT_ZONE_STYLE(gZoneMapsWeight[k]));
        }
        layer.setStyle(HIGHLIGHTED_ZONE_STYLE);
        layer.bringToFront();
        
        var nameKey = e.target.feature.properties["KEY"];
        if (nameKey !== null){
            $("#lblZoneName").html(e.target.feature.properties[nameKey]);
        }
    });
}

var download = function(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}; 