(function(factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS: hard-coded dependency on "knockout"
        factory(require("knockout"));
    } else if (typeof define === "function" && define["amd"]) {
        //AMD anonymous module with hard-coded dependency on "knockout"
        define(["knockout"], factory);
    } else {
        // <script> tag: use the global 'ko' object, registering the binding handler
        factory(ko);
    }
})(function(ko) {

    /*
     * Utility functions
     */

    /**
     * Check if 2 floating point numbers are equal
     *
     * @see http://stackoverflow.com/a/588014
     */

    var floatEqual = function(f1, f2) {
        return (Math.abs(f1 - f2) < 0.000001);
    };

    var unwrap = ko.utils.unwrapObservable,
        filter = ko.utils.arrayFilter;

    var extend = function(target) {
        for (var idx = 1; idx < arguments.length; idx++) {
            var source = arguments[idx];
            for (var prop in source) {
                if (source.hasOwnProperty(prop))
                    target[prop] = unwrap(source[prop]);
            }
        }
        return target;
    };

    var forEach = function(array, action) {
        for (var idx = 0; idx < array.length; idx++) {
            action(array[idx], idx);
        }
    };

    var mapFilter = function(array, predicate, transform) {
        var results = [];
        for (var idx = 0; idx < array.length; idx++) {
            var item = array[idx];
            if (predicate(item)) results.push(transform(item));
        }
        return results;
    };

    var queueTask = function(callback) {
        window.setTimeout(callback, 0);
    };

    var MapModel = function(bindings, element) {
        var _mapInstance = null,
            _clusterer = null,
            _markers = [], // caches the instances of google.maps.Marker
            _handlers = [], // event handler objects
            _userHandlers = [], //user-defined event handler objects
            _defaults = {
                zoom: 8,
                draggable: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            },
            o = extend({}, _defaults, unwrap(bindings.options)),
            self = this,
            currentMarker = null,
            currentInfoWindow = null,
            currentInfoWindowElement = null;

        var _center = unwrap(bindings.center);
        self.center = new google.maps.LatLng(_center.latitude, _center.longitude);
        self.bounds = null;
        self.zoom = unwrap(bindings.zoom);
        self.draggable = unwrap(bindings.draggable);
        self.dragging = false;
        self.markers = [];
        self.mapTypeId = unwrap(bindings.mapTypeId);
        self.clusterSettings = unwrap(bindings.cluster);

        self.draw = function() {
            if (_mapInstance === null) {
                _mapInstance = new google.maps.Map(element, extend(o, {
                    center: self.center,
                    zoom: self.zoom,
                    draggable: self.draggable,
                    mapTypeId: self.mapTypeId
                }));

                google.maps.event.addListener(_mapInstance, 'dragstart', function() {
                    self.dragging = true;
                });
                google.maps.event.addListener(_mapInstance, 'idle', function() {
                    self.dragging = false;
                });
                google.maps.event.addListener(_mapInstance, 'drag', function() {
                    self.dragging = true;
                });
                google.maps.event.addListener(_mapInstance, 'zoom_changed', function() {
                    self.zoom = _mapInstance.getZoom();
                    self.center = _mapInstance.getCenter();
                });
                google.maps.event.addListener(_mapInstance, 'center_changed', function() {
                    self.center = _mapInstance.getCenter();
                });
                google.maps.event.addListener(_mapInstance, 'maptypeid_changed', function() {
                    self.mapTypeId = _mapInstance.getMapTypeId();
                });
                google.maps.event.addListener(_mapInstance, 'bounds_changed', function() {
                    var bounds = _mapInstance.getBounds();
                    self.bounds = {
                        sw: {
                            latitude: bounds.getSouthWest().lat(),
                            longitude: bounds.getSouthWest().lng()
                        },
                        ne: {
                            latitude: bounds.getNorthEast().lat(),
                            longitude: bounds.getNorthEast().lng()
                        }
                    };
                });

                if (_handlers.length > 0) {
                    forEach(_handlers, function(handler) {
                        google.maps.event.addListener(_mapInstance, handler.on, handler.handler);
                    });
                }

                forEach(bindings.markers(), function(marker, idx) {
                    self.addMarker(idx, marker);
                });
            }

            google.maps.event.trigger(_mapInstance, "resize");
            _mapInstance.setMapTypeId(self.mapTypeId);

            var instanceCenter = _mapInstance.getCenter();

            if (!floatEqual(instanceCenter.lat(), self.center.lat())
                || !floatEqual(instanceCenter.lng(), self.center.lng())) {
                _mapInstance.setCenter(self.center);
            }

            if (_mapInstance.getZoom() != self.zoom) {
                _mapInstance.setZoom(self.zoom);
            }

            if (self.clusterSettings) {
                _clusterer = new MarkerClusterer(_mapInstance, _markers, self.clusterSettings);
            }

        };

        self.on = function(evt, handler) {
            _handlers.push({
                "on": evt,
                "handler": handler
            });
        };

        self.addHandler = function(idx, evt, handler) {
            _userHandlers.splice(idx, 0, google.maps.event.addListener(_mapInstance, evt, handler))
        };

        self.removeHandler = function(idx) {
            if (_userHandlers[idx]) _userHandlers.splice(idx, 1);
        };

        self.fit = function() {
            if (_mapInstance && _markers.length > 0) {
                var bounds = new google.maps.LatLngBounds();

                forEach(_markers, function(marker) {
                    bounds.extend(marker.getPosition());
                });

                _mapInstance.fitBounds(bounds);
            }
        };

        self.addMarker = function(idx, data) {
            var lat = unwrap(data.latitude),
                lng = unwrap(data.longitude),
                icon = unwrap(data.icon) || null,
                title = unwrap(data.title) || null,
                draggable = unwrap(data.draggable) || null,
                visible = unwrap(data.visible) || null,
                clickable = unwrap(data.clickable) || null;

            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lng),
                map: _mapInstance
            });

            if (icon) marker.setIcon(icon);
            if (ko.isObservable(data.icon)) {
                data.icon.subscribe(function(newValue) {
                    marker.setIcon(newValue);
                });
            }
            if (title) marker.setTitle(title);
            if (ko.isObservable(data.title)) {
                data.title.subscribe(function(newValue) {
                    marker.setTitle(newValue);
                });
            }
            if (draggable) marker.setDraggable(draggable);
            if (ko.isObservable(data.draggable)) {
                data.draggable.subscribe(function(newValue) {
                    marker.setDraggable(newValue);
                });
            }
            if (visible) marker.setVisible(visible);
            if (ko.isObservable(data.visible)) {
                data.visible.subscribe(function(newValue) {
                    marker.setVisible(newValue);
                });
            }
            if (clickable) maker.setClickable(clickable);
            if (ko.isObservable(data.clickable)) {
                data.clickable.subscribe(function(newValue) {
                    marker.setClickable(newValue);
                });
            }
            if (ko.isObservable(data.latitude) && ko.isObservable(data.longitude)) {
                ko.computed(function() {
                    var latitude = data.latitude(),
                        longitude = data.longitude();
                    return { latitude: latitude, longitude: longitude };
                }).subscribe(function(newPosition) {
                    var originalPosition = marker.getPosition();
                    if (!(floatEqual(newPosition.latitude, originalPosition.lat()) &&
                        floatEqual(newPosition.longitude, originalPosition.lng()))) {
                        marker.setPosition(new google.maps.LatLng(newPosition.latitude, newPosition.longitude));
                    }
                });
            }

            if (data.infoWindow != null) {
                google.maps.event.addListener(marker, "click", function() {
                    if (currentInfoWindow != null) {
                        currentInfoWindow.close();
                        ko.cleanNode(currentInfoWindowElement);
                    }

                    currentMarker = marker;

                    if (data.infoWindow) {
                        var content = "";
                        var infoWindowContent = unwrap(data.infoWindow);
                        if (typeof(infoWindowContent) === 'object') {
                            content = document.getElementById(infoWindowContent.template).innerHTML;
                        } else {
                            content = infoWindowContent;
                        }

                        var container = document.createElement("div");
                        container.setAttribute("id", "info-window-container");
                        container.innerHTML = content;

                        var infoWindow = new google.maps.InfoWindow({
                            content: container
                        });

                        infoWindow.open(_mapInstance, marker);
                        currentInfoWindow = infoWindow;
                        currentInfoWindowElement = container;
                        google.maps.event.addListener(infoWindow, 'closeclick', function() {
                            ko.cleanNode(currentInfoWindowElement);
                            currentMarker = null;
                        });
                        ko.applyBindings(data, container);
                    }
                });
            }

            _markers.splice(idx, 0, marker);

            self.markers.splice(idx, 0, {
                "lat": lat,
                "lng": lng,
                "draggable": false,
                "icon": icon,
                "infoWindow": data.infoWindow
            });

            return marker;
        };

        self.removeMarker = function(idx) {
            var marker = _markers[idx];

            if (currentMarker === marker) {
                currentInfoWindow.close();
                ko.cleanNode(currentInfoWindowElement);
                currentMarker = null;
            }

            _markers.splice(idx, 1);
            self.markers.splice(idx, 1);

            marker.setMap(null);
        };
    };

    ko.bindingHandlers.gmaps = (function() {
        var parseBindings = function(valueAccessor, allBindings) {
            var options = valueAccessor() || {},
                bindings = { options: options };

            forEach(['handlers', 'draggable', 'zoom', 'center', 'markers', 'mapTypeId', 'fit', 'bounds', 'events', 'cluster'], function(binding) {
                if (allBindings[binding])
                    bindings[binding] = allBindings[binding];
            });

            return bindings;
        };

        var handleEvents = function(map, bindings, updateBinding) {
            map.on('drag', function() {
                var center = map.center;

                queueTask(function() {
                    updateBinding('center', {
                        latitude: center.lat(),
                        longitude: center.lng()
                    })
                });
            });

            map.on('zoom_changed', function() {
                var oldZoom = unwrap(bindings.zoom);
                if (oldZoom != map.zoom) {
                    queueTask(function() {
                        updateBinding('zoom', map.zoom);
                    });
                }
            });

            map.on('center_changed', function() {
                var center = map.center;

                queueTask(function() {
                    if (!map.dragging) {
                        updateBinding('center', {
                            latitude: center.lat(),
                            longitude: center.lng()
                        });
                    }
                });
            });

            map.on('maptypeid_changed', function() {
                var mapTypeId = map.mapTypeId;

                queueTask(function() {
                    updateBinding('mapTypeId', mapTypeId);
                });
            });

            map.on('bounds_changed', function() {
                var bounds = map.getBounds();

                queueTask(function() {
                    updateBinding('bounds', bounds);
                });
            });
        };

        var registerSubscriptions = function(map, bindings) {
            bindings.markers.subscribe(function(changes) {
                queueTask(function() {
                    var removedIndexes = mapFilter(changes, function(item) {
                        return item.status === 'deleted';
                    }, function(item) {
                        return item.index;
                    });
                    var added = filter(changes, function(item) {
                        return item.status === 'added';
                    });

                    forEach(removedIndexes, map.removeMarker);

                    forEach(added, function(item) {
                        map.addMarker(item.index, item.value);
                    });

                    // Fit map when there is more than one marker.
                    // This will change the center coordinates
                    if (bindings['fit'] && unwrap(bindings.fit) && map.markers.length > 1) {
                        map.fit();
                    }
                });
            }, null, 'arrayChange');

            // update map when center changes
            bindings.center.subscribe(function(newValue) {
                var center = map.center,
                    lat = center.lat(),
                    lng = center.lng();

                if (floatEqual(lat, newValue.latitude) && floatEqual(lng, newValue.longitude)) {
                    return;
                }

                if (!map.dragging) {
                    map.center = new google.maps.LatLng(newValue.latitude, newValue.longitude);
                    map.draw();
                }
            });

            bindings.zoom.subscribe(function(newValue) {
                if (newValue != undefined && newValue != null && newValue != "") {
                    var intValue = parseInt(newValue);
                    if (typeof intValue === 'number' && intValue !== map.zoom) {
                        map.zoom = intValue;
                        map.draw();
                    }
                }
            });

            if (ko.isObservable(bindings.mapTypeId)) {
                bindings.mapTypeId.subscribe(function(newValue) {
                    if (newValue != undefined && newValue != null && newValue != "" && newValue != map.mapTypeId) {
                        var uppercase = newValue.toUpperCase(),
                            lowercase = newValue.toLowerCase();

                        if (google.maps.MapTypeId[uppercase] && google.maps.MapTypeId[uppercase] == lowercase) {
                            map.mapTypeId = lowercase;
                            map.draw();
                        }
                    }
                });
            }

            if (ko.isObservable(bindings.events)) {
                bindings.events.subscribe(function(changes) {
                    queueTask(function() {
                        var removedIndexes = mapFilter(changes, function(item) {
                            return item.status === 'deleted';
                        }, function(item) {
                            return item.index;
                        });

                        var added = filter(changes, function(item) {
                            return item.status === 'added';
                        });

                        forEach(removedIndexes, map.removeHandler);

                        forEach(added, function(item) {
                            map.addHandler(item.value.evt, item.value.handler);
                        });
                    });
                }, null, 'arrayChange');
            }

            if (ko.isObservable(bindings.cluster)) {
                bindings.cluster.subscribe(function(newValue) {
                    map.clusterSettings = newValue;
                    map.draw();
                });
            }
        };

        return {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var allBindings = allBindingsAccessor(),
                    bindings = parseBindings(valueAccessor, allBindings),
                    _map = new MapModel(bindings, element);

                var updateBinding = function(binding, value) {
                    if (ko.isWriteableObservable(bindings[binding])) {
                        bindings[binding](value);
                    } else if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers'][binding]) {
                        allBindings['_ko_property_writers'][binding](value); // update non-observable property
                    }
                };

                handleEvents(_map, bindings, updateBinding);

                viewModel['_map'] = _map;

                _map.draw();

                registerSubscriptions(_map, bindings);                
            }
        };
    })();
});