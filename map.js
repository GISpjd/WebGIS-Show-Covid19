// 在pg数据库转化一下数据格式
// UPDATE world_covid_data
// SET date = TO_CHAR(TO_DATE(date, 'DD-MM-YYYY'), 'YYYY-MM-DD')
// WHERE TO_DATE(date, 'DD-MM-YYYY') IS NOT NULL;


$("#parameter").change(() => { init() });
$("#start_date").change(() => { init() })
$("#end_date").change(() => { init() })


var map, popup

var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

closer.onclick = function () {
    popup.setPosition(undefined);
    closer.blur();
    return false;
};


// 弹出框
popup = new ol.Overlay({
    element: document.getElementById('popup'),
    autoPan: true
})

const view = new ol.View({
    center: [120.2052342, 30.2489634],
    projection: 'EPSG:4326',
    zoom: 5
})


map = new ol.Map({
    target: 'map',
    view: view,
    overlays: [popup]
})

// 底图集合
let base_maps = new ol.layer.Group({
    title: 'Base maps',
    layers: [
        new ol.layer.Tile({
            title: 'Satellite',
            type: 'base',
            visible: true,
            source: new ol.source.XYZ({
                attributions: ['Powered by Esri',
                    'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
                ],
                attributionsCollapsible: false,
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                maxZoom: 23
            })
        }),
        new ol.layer.Tile({
            title: 'GaoDe',
            type: 'base',
            visible: 'true',
            source: new ol.source.XYZ({
                url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}',
                wrapX: false
            })
        }),
        new ol.layer.Tile({
            title: 'Mapbox',
            type: 'base',
            visible: true,
            source: new ol.source.XYZ({
                url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY3VkODUiLCJhIjoiY2xrYnFncXZhMGc1cTNlbmFrNHN1N2cxeCJ9.69E3f8nMJkvqQDRhLSojVw'
            })
        }),
    ]
})

// 预备覆盖图层
let overlays = new ol.layer.Group({
    title: 'Overlays',
    layers: []
})

// 图层切换控件(引入)
const layerSwitcher = new ol.control.LayerSwitcher({
    activationMode: 'click',
    startActive: false,
    tipLabel: 'Layers',
    groupSelectStyle: 'children',
    collapseTipLabel: 'Collapse layers',
});

// 全屏
const fullScreen = new ol.control.FullScreen({
    label: 'F',
    className: 'ol-full-screen' // 默认就是这个，可知ol.css查看
})

const zoomSlider = new ol.control.ZoomSlider()
// 范围定到了整个中国
const zoomToExtent = new ol.control.ZoomToExtent({
    className: 'ol-zoom-extent',
    extent: [
        53.5, 3.85,
        135.08, 73.55
    ]
})

map.addLayer(base_maps)
map.addLayer(overlays)
map.addControl(layerSwitcher)
map.addControl(fullScreen)
map.addControl(zoomSlider)
map.addControl(zoomToExtent)

// 初始化图层和图表
init()




var startDate, endDate
// 下拉框选中项目的值
var paramValue
// 两个要存入overlays的图层
var geojsonLayer, geojsonPoint
var getStyle1, getStyle2
var lineGraph, barGraph

// 展示图层和图表
function init() {
    popup.setPosition(undefined)
    closer.blur()

    if (featureOverlay) {
        featureOverlay.getSource().clear()
        map.removeLayer(featureOverlay)
    }

    if (lineGraph) {
        lineGraph.destroy()
    }

    if (barGraph) {
        barGraph.destroy()
    }

    if (geojsonLayer) {
        geojsonLayer.getSource().clear()
        overlays.getLayers().remove(geojsonLayer)
    }

    if (geojsonPoint) {
        geojsonPoint.getSource().clear()
        overlays.getLayers().remove(geojsonPoint)
    }

    //'YYYY-MM-DD'
    startDate = document.getElementById("start_date").value
    endDate = document.getElementById("end_date").value
    // console.log(start_date);


    const parameter = document.getElementById("parameter")
    paramValue = parameter.options[parameter.selectedIndex].value


    // var url_max = `jsp_files1/max_value_spatial.jsp?date1=${startDate}&date2=${endDate}&parameter=${paramValue}`
    var url_max = `http://localhost:3000/get-maximum?parameter=${paramValue}&date1=${startDate}&date2=${endDate}`
    var url_point = `jsp_files1/geojson_layer_point_spatial.jsp?date1=${startDate}&date2=${endDate}&parameter=${paramValue}`
    // var url_point = `http://localhost:3000/geojson-centroids?parameter=${paramValue}&date1=${startDate}&date2=${endDate}`
    var url_poly = `jsp_files1/geojson_layer_spatial.jsp?date1=${startDate}&date2=${endDate}&parameter=${paramValue}`
    // var url_poly = `http://localhost:3000/geojson-data?parameter=${paramValue}&date1=${startDate}&date2=${endDate}`
    // console.log(url_poly);
    // var url_cum_graph = `jsp_files1/graph_world_cumulative.jsp?date1=${startDate}&date2=${endDate}&parameter=${paramValue}`
    var url_cum_graph = `http://localhost:3000/cumulative-by-world?parameter=${paramValue}&date1=${startDate}&date2=${endDate}`
    // var url_daily_graph = `jsp_files1/graph_world_daily.jsp?date1=${startDate}&date2=${endDate}&parameter=${paramValue}`
    var url_daily_graph = `http://localhost:3000/daily-by-world?parameter=${paramValue}&date1=${startDate}&date2=${endDate}`
    console.log(url_daily_graph);
    // var url_counter_world = `jsp_files1/counter_world.jsp?date1=${startDate}&date2=${endDate}&parameter=${paramValue}`
    var url_counter_world = `http://localhost:3000/covid-summary?date1=${startDate}&date2=${endDate}`
    // console.log(url_counter_world);


    $.getJSON(url_max, function (data) {
        // console.log(data);
        let max = data.maximum[0].max
        console.log(max);
        var diff = max / 7
        const color = [[254, 217, 118, 0.7], [254, 178, 76, 0.7], [253, 141, 60, 0.7], [252, 78, 42, 0.7], [227, 26, 28, 0.7], [189, 0, 38, 0.7], [128, 0, 38, 0.7]]

        // 设置各国家面的样式
        getStyle1 = function (feature, resolution) {
            for (let i = 0; i < 7; i++) {
                if (feature.get(paramValue) > (i * diff) && feature.get(paramValue) <= ((i + 1) * diff)) {
                    return new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: color[i] // semi-transparent red
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            lineDash: [2],
                            width: 2
                        })
                    })
                }

                if (paramValue == 'vaccinations' || paramValue == 'tests') {
                    // document.getElementById(i.toString()).innerHTML = Math.round((i * diff) / 1000000) + "M - " + Math.round(((i + 1) * diff) / 1000000) + "M"
                    $("#" + i).html(Math.round((i * diff) / 1000000) + "M - " + Math.round(((i + 1) * diff) / 1000000) + "M");

                } else {
                    // document.getElementById(i.toString()).innerHTML = Math.round((i * diff) / 1000) + "K - " + Math.round(((i + 1) * diff) / 1000) + "K"
                    $("#" + i).html(Math.round((i * diff) / 1000) + "K - " + Math.round(((i + 1) * diff) / 1000) + "K");

                }
                document.getElementById('legend_title').innerHTML = '<span>Legend - COVID ' + paramValue + '</span>'
            }

            if (feature.get(paramValue) == 0) {
                return new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: [254, 217, 118, 0.7]
                    }),
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        lineDash: [1],
                        width: 2
                    })
                });
            }
        }

        // 设置点图层的样式
        getStyle2 = function (feature, resolution) {
            const fill = new ol.style.Fill({ color: 'rgba(255,255,0,0.6)' })
            const stroke = new ol.style.Stroke({ color: 'rgba(255, 0, 0, 0.6)', width: 1 })
            for (let i = 0; i < 7; i++) {
                // console.log(feature.get(paramValue));
                if (feature.get(paramValue) > (i * diff) && feature.get(paramValue) <= ((i + 1) * diff)) {
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 5 * (i + 1),
                            fill: fill,
                            stroke: stroke
                        }),

                    });
                }

            }
            if (feature.get([paramValue]) == 0) {
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 0,
                        fill: fill,
                        stroke: stroke
                    }),

                });
            }
        }

    })

    geojsonLayer = new ol.layer.Vector({
        //layerSwitcher需要
        title: `COVID ${paramValue}(${startDate} to ${endDate})`,
        source: new ol.source.Vector({
            url: url_poly,
            format: new ol.format.GeoJSON({
                dataProjection: 'EPSG:4326', // 源数据的投影
                featureProjection: 'EPSG:3857' // 地图的投影
            })
        }),

        style: function (feature, resolution) {
            return getStyle1(feature, resolution)
        }
    })

    geojsonLayer.getSource().on('addfeature', function () {
        map.getView().fit(
            geojsonLayer.getSource().getExtent(),
            { duration: 1000, size: map.getSize() }
        );
    });

    geojsonPoint = new ol.layer.Vector({
        title: `COVID ${paramValue}(${startDate} to ${endDate})_circle`,
        source: new ol.source.Vector({
            url: url_point,
            format: new ol.format.GeoJSON({
                dataProjection: 'EPSG:4326', // 源数据的投影
                featureProjection: 'EPSG:3857' // 地图的投影
            }),
        }),
        style: function (feature, resolution) {
            return getStyle2(feature, resolution);
        }
    })

    // 当有新的要素添加到数据源会被触发
    geojsonPoint.getSource().on('addfeature', function () {
        // 将地图视角调整到刚好能够包含所有要素的范围
        map.getView().fit(
            geojsonPoint.getSource().getExtent(), {
            duration: 1000,
            size: map.getSize(),
            easing: ol.easing.easeOut,
            // callback: () => {
            //     console.log('调整完成');
            // }
        }
        );
    });

    overlays.getLayers().push(geojsonLayer)
    overlays.getLayers().push(geojsonPoint);


    layerSwitcher.renderPanel()



    $.getJSON(url_cum_graph, function (data) {
        // console.log(data);
        let date = []
        let count = []
        for (let i in data) {
            // console.log(data[i]);
            date.push(data[i].date)
            count.push(data[i][paramValue])
        }

        let ctx_line = document.getElementById('lineGraph')
        lineGraph = new Chart(ctx_line, {
            type: 'line',
            data: {
                labels: date,
                datasets: [{
                    label: 'COVID ' + paramValue,
                    data: count,
                    fill: false,
                    backgroundColor: 'rgba(255, 0, 0, 1)',
                    borderColor: 'rgba(255, 0, 0, 1)',
                    hoverBackgroundColor: 'rgba(200, 200, 200, 1)',
                    hoverBorderColor: 'rgba(200, 200, 200, 1)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'World Cumulative COVID ' + paramValue + '(' + startDate + ' to ' + endDate + ')'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: true
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'COVID ' + paramValue
                        },
                        ticks: {
                            beginAtZero: true
                        }
                    }
                }
            }
        })
    })




    $.getJSON(url_daily_graph, function (data) {
        // console.log(data);
        let date = []
        let count = []
        for (let i in data) {
            // console.log(data[i]);
            date.push(data[i].date)
            // count.push(data[i][paramValue])
            count.push(data[i].total)
        }

        let ctx_bar = document.getElementById('barGraph')
        barGraph = new Chart(ctx_bar, {
            type: 'bar',
            data: {
                labels: date,
                datasets: [
                    {
                        label: 'COVID ' + paramValue,
                        backgroundColor: 'rgba(255, 0, 0, 1)',
                        borderColor: 'rgba(255, 0, 0, 1)',
                        hoverBackgroundColor: 'rgba(200, 200, 200, 1)',
                        hoverBorderColor: 'rgba(200, 200, 200, 1)',
                        data: count,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'World Daily COVID ' + paramValue + '(' + startDate + ' to ' + endDate + ')'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                },

                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'COVID ' + paramValue
                        },
                        ticks: {
                            beginAtZero: true
                        }
                    }
                }
            }
        })
    })


    $.getJSON(url_counter_world, function (data) {
        // console.log(data);
        $('#cases').html('Cases: ' + data.cases)
        $("#deaths").html('Deaths: ' + data.deaths)
        $("#tests").html('Tests: ' + data.tests)
        $("#vaccinations").html('Vaccinations: ' + data.vaccinations)
    })
}



var featureOverlay, selectedFeature

function click_info(event) {
    if (featureOverlay) {
        featureOverlay.getSource().clear()
        map.removeLayer(featureOverlay)
    }

    // 根据鼠标点击位置选中的要素
    selectedFeature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
        return feature
    })

    const highlightStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#3399CC',
            width: 2
        }),
        image: new ol.style.Circle({
            fill: new ol.style.Fill({
                color: 'rgba(255,255,255,0.7)'
            }),
            stroke: new ol.style.Stroke({
                color: '#3399CC',
                width: 3
            }),
            radius: 5
        })
    })

    featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector(),
        map: map,
        style: highlightStyle
    })

    if (selectedFeature) {
        // let geometry = selectedFeature.getGeometry()
        let coordinate = event.coordinate
        let textFill = `<h4>${selectedFeature.get('country_name')}</h4>`
        textFill += `<h5>Covid ${paramValue}:${selectedFeature.get(paramValue)}</h5>`

        content.innerHTML = textFill
        popup.setPosition(coordinate)
        featureOverlay.getSource().addFeature(selectedFeature)
    }

}


function click_graph(event) {
    if (lineGraph) {
        lineGraph.destroy()
    }
    if (barGraph) {
        barGraph.destroy()
    }
    if (selectedFeature) {
        var country_name = selectedFeature.get('country_name')
        paramValue = parameter.options[parameter.selectedIndex].value
        startDate = document.getElementById("start_date").value
        endDate = document.getElementById("end_date").value

        // var url_cum_graph = `jsp_files1/graph_country_cumulative.jsp?parameter=${paramValue}&date1=${startDate}&date2=${endDate}&country=${country_name}`
        var url_cum_graph = `http://localhost:3000/cumulative-by-country?parameter=${paramValue}&date1=${startDate}&date2=${endDate}&country=${country_name}`
        // var url_daily_graph = `jsp_files1/graph_country_daily.jsp?parameter=${paramValue}&date1=${startDate}&date2=${endDate}&country=${country_name}`
        var url_daily_graph = `http://localhost:3000/daily-by-country?parameter=${paramValue}&date1=${startDate}&date2=${endDate}&country=${country_name}`
        // var url_counter_country = `jsp_files1/counter_country.jsp?parameter=${paramValue}&date1=${startDate}&date2=${endDate}&country=${country_name}`
        var url_counter_country = `http://localhost:3000/covid-country-summary?date1=${startDate}&date2=${endDate}&country=${country_name}`


        $.getJSON(url_cum_graph, function (data) {
            let date = []
            let count = []
            for (let i in data) {
                // console.log(data[i]);
                date.push(data[i].date)
                count.push(data[i][paramValue])
            }

            let ctx_line = document.getElementById('lineGraph')
            lineGraph = new Chart(ctx_line, {
                type: 'line',
                data: {
                    labels: date,
                    datasets: [{
                        label: 'COVID ' + paramValue,
                        data: count,
                        fill: false,
                        backgroundColor: 'rgba(255, 0, 0, 1)',
                        borderColor: 'rgba(255, 0, 0, 1)',
                        hoverBackgroundColor: 'rgba(200, 200, 200, 1)',
                        hoverBorderColor: 'rgba(200, 200, 200, 1)',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: country_name + ' - Cumulative COVID ' + paramValue + '(' + startDate + ' to ' + endDate + ')'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: true
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'COVID ' + paramValue
                            },
                            ticks: {
                                beginAtZero: true
                            }
                        }
                    }
                }
            })
        })

        $.getJSON(url_daily_graph, function (data) {
            let date = []
            let count = []
            for (let i in data) {
                // console.log(data[i]);
                date.push(data[i].date)
                count.push(data[i][paramValue])
            }

            let ctx_bar = document.getElementById('barGraph')
            barGraph = new Chart(ctx_bar, {
                type: 'bar',
                data: {
                    labels: date,
                    datasets: [{
                        label: 'COVID ' + paramValue,
                        data: count,
                        fill: false,
                        backgroundColor: 'rgba(255, 0, 0, 1)',
                        borderColor: 'rgba(255, 0, 0, 1)',
                        hoverBackgroundColor: 'rgba(200, 200, 200, 1)',
                        hoverBorderColor: 'rgba(200, 200, 200, 1)',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: country_name + ' - Daily COVID ' + paramValue + '(' + startDate + ' to ' + endDate + ')'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: true
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'COVID ' + paramValue
                            },
                            ticks: {
                                beginAtZero: true
                            }
                        }
                    }
                }
            })
        })

        $.getJSON(url_counter_country, function (data) {
            // $("#cases").html('Cases: ' + Math.round(data[0].cases));
            $("#cases").html('Cases: ' + Math.round(data.cases));
            $("#deaths").html('Deaths: ' + Math.round(data.deaths));
            $("#tests").html('Tests: ' + Math.round(data.tests));
            $("#vaccinations").html('Vaccinations: ' + Math.round(data.vaccinations));
        });

    }
}

map.on('click', function (event) {
    click_info(event)
    click_graph(event)
})

