// knockout-google-maps - v0.0.1 
// (c) Nick Fisher - https://github.com/nrf110/knockout-google-maps
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
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
        forEach = ko.utils.arrayForEach,
        map = ko.utils.arrayMap,
        find = ko.utils.arrayFirst,
        filter = ko.utils.arrayFilter,
        extend = function(target) {
            for (var idx = 1; idx < arguments.length; idx++) {
                var source = arguments[idx];
                for (prop in source) {
                    target[prop] = unwrap(source[prop]);
                }
            }
            return target;
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
            _markers = [], // caches the instances of google.maps.Marker
            _handlers = [], // event handler objects
            _defaults = {
                zoom: 8,
                draggable: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            },
            o = extend({}, _defaults, unwrap(bindings.options)),
            self = this,
            currentInfoWindow = null;

        self.center = unwrap(bindings.center);
        self.zoom = unwrap(bindings.zoom);
        self.draggable = unwrap(bindings.draggable);
        self.dragging = false;
        self.markers = [];

        _mapInstance = new google.maps.Map(element, extend(o, {
            center: bindings.center,
            zoom: bindings.zoom,
            draggable: bindings.draggable,
            mapTypeId: bindings.mapTypeId
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

        if (_handlers.length > 0) {
            forEach(_handlers, function(handler) {
                google.maps.event.addListener(_mapInstance, handler.on, handler.handler);
            });
        }

        self.draw = function() {
            google.maps.event.trigger(_mapInstance, "resize");

            var instanceCenter = _mapInstance.getCenter();

            if (!floatEqual(instanceCenter.lat(), self.center.lat())
                || !floatEqual(instanceCenter.lng(), self.center.lng())) {
                _mapInstance.setCenter(self.center);
            }

            if (_mapInstance.getZoom() != self.zoom) {
                _mapInstance.setZoom(self.zoom);
            }
        };

        self.on = function(evt, handler) {
            self._handlers.push({
                "on": evt,
                "handler": handler
            });
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

        self.addMarker = function(idx, lat, lng, icon, infoWindowContent) {
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lng),
                map: _mapInstance,
                icon: icon
            });

            // TODO: find a better way of mating info windows to knockout templates
            if (infoWindowContent != null) {
                var infoWindow = new google.maps.InfoWindow({
                    content: infoWindowContent
                });

                google.maps.event.addListener(marker, "click", function() {
                    if (currentInfoWindow != null) {
                        currentInfoWindow.close();
                    }
                    infoWindow.open(_mapInstance, marker);
                    currentInfoWindow = infoWindow;
                });
            }

            _markers[idx] = marker;

            self.markers[idx] = {
                "lat": lat,
                "lng": lng,
                "draggable": false,
                "icon": icon,
                "infoWindowContent": infoWindowContent
            };

            return marker;
        };

        self.removeMarker = function(idx) {
            var marker = _markers[idx];

            _markers.splice(idx, 1);
            self.markers.splice(idx, 1);

            marker.setMap(null);
        };
    };

    ko.bindingHandlers.gmaps = (function() {
        var parseBindings = function(valueAccessor, allBindings) {
            var options = valueAccessor() || {},
                bindings = { options: options };

            forEach(['handlers', 'draggable', 'zoom', 'center', 'markers', 'mapTypeId', 'fit'], function(binding) {
                if (allBindings[binding])
                    bindings[binding] = allBindings[binding];
            });

            return bindings;
        };

        return {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var allBindings = allBindingsAccessor(),
                    bindings = parseBindings(valueAccessor, allBindings),
                    _map = new MapModel(bindings, element);

                var updateBinding = function(binding, value) {
                    if (ko.utils.isWriteableObservable(bindings[binding])) {
                        bindings[binding](value);
                    } else if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers'][binding]) {
                        allBindings['_ko_property_writers'][binding](value); // update non-observable property
                    }
                };

                _map.on('drag', function() {
                    var center = _map.center;

                    queueTask(function() {
                        updateBinding('center', {
                            latitude: center.lat(),
                            longitude: center.lng()
                        })
                    });
                });

                _map.on('zoom_changed', function() {
                    var oldZoom = unwrap(bindings.zoom);
                    if (oldZoom != _map.zoom) {
                        queueTask(function() {
                            updateBinding('zoom', _map.zoom);
                        });
                    }
                });

                _map.on('center_changed', function() {
                    var center = _map.center;

                    queueTask(function() {
                        if (!_map.dragging) {
                            updateBinding('center', {
                                latitude: center.lat(),
                                longitude: center.lng()
                            });
                        }
                    });
                });


                viewModel['_map'] = _map;

                _map.draw();

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

                        forEach(removedIndexes, _map.removeMarker);

                        forEach(added, function(item) {
                            _map.addMarker(item.latitude, item.longitude, item.icon, item.infoWindow);
                        });

                        // Fit map when there is more than one marker.
                        // This will change the center coordinates
                        if (bindings['fit'] && unwrap(bindings.fit) && _map.markers.length > 1) {
                            _map.fit();
                        }
                    });
                }, null, 'arrayChange');

                // update map when center changes
                bindings.center.subscribe(function(newValue) {
                    var center = _map.center,
                        lat = center.lat(),
                        lng = center.lng();

                    if (floatEqual(lat, newValue.latitude) && floatEqual(lng, newValue.longitude)) {
                        return;
                    }

                    if (!_map.dragging) {
                        _map.center = new google.maps.LatLng(newValue.latitude, newValue.longitude);
                        _map.draw();
                    }
                });

                bindings.zoom.subscribe(function(newValue) {
                    if (newValue !== _map.zoom) {
                        _map.zoom = newValue;
                        _map.draw();
                    }
                });
            }
        };
    })();
});