
/*jslint
    this: true, for: true, white: true
*/

/**
    * Options for select function.
    * @typedef {Object} selectOptions
    * @property { string } indexName - Optional. Name of index to search in.
    * @property { IDBKeyRange } keyRange - Optional. A key range can be a single value or a range with upper and lower bounds or endpoints. If the key range has both upper and lower bounds, then it is bounded; if it has no bounds, it is unbounded. A bounded key range can either be open (the endpoints are excluded) or closed (the endpoints are included).
    * @property { Function } filterFn - Optional. A function to filter items in the store being queried. Should be something like: function (elementOfArray[, indexInArray]) { return elementOfArray.pr_Deleted == "False"; })
    * @property { Function } transformFn - Optional.  A function to transform each item before adding it to the result array. Pass null to return the original item. Should be something like: function (valueOfElement) { return new Genus.PriceMatrixRule(valueOfElement); }
    * @property { Function|string|ArrayLike<string>|boolean } [orderBy] Either a function to sort items, a string naming 1 field to sort by, an array of strings naming multiple fields to sort by, or true to sort a string array result by default ascii character order.
    * @property { boolean } sortAscending - Optional. A flag specifying whether to sort in ascending order (default) or descending.
    * @property { boolean } returnFirstItemOnly - Optional. Pass true to have just the first result item returned; otherwise an array containing all results is returned.
 */

/**
    * Options for selectInnerJoinOnArray function.
    * @typedef {Object} selectInnerJoinOnArrayOptions
    * @property {function} [storeFilterFn] Optional function to filter items in the store being queried.
    * @property {function|Boolean|null} [transformFnOrSelectDbItemsOnly] Optional function to transform each database and matching array item before adding it to the result array. Or pass true to return just the database items. Or pass null/false to return database items merged with the matching array item.
    * @property {function|string|Array<string>|null} [orderBy] Either a function to sort items, a string naming 1 field to sort by, an array of strings naming multiple fields to sort by, or true to sort a string array result by default ascii character order.
    * @property {bool} [sortAscending] Optional Flag specifying whether to sort in ascending order (default) or descending.
    * @property {Array} joinArray The array to join to.
    * @property {string} dbField The database field name to join with arrayField.
    * @property {string} [arrayField] The array field name to join with dbField. Ignore this param if you want to compare against array items themselves, e.g. array of int IDs.
*/

/**
    * Options for selectLeftJoinOnArray function.
    * @typedef {Object} selectLeftJoinOnArrayOptions
    * @property {function} storeFilterFn Optional function to filter items in the store being queried.
    * @property {function|boolean} transformFnOrSelectDbItemsOnly Optional function to transform each database and array before adding it to the result array. Or pass true to return just the database items. Or pass null/false to return database items merged with the matching array item.
    * @property {function|string|array<string>} [orderBy] Either a function to sort items, a string naming 1 field to sort by, an array of strings naming multiple fields to sort by, or true to sort a string array result by default ascii character order.
    * @property {bool} [sortAscending] Optional Flag specifying whether to sort in ascending order (default) or descending.
    * @property {array} joinArray The array to join to.
    * @property {string} dbField The database field name to join with arrayField.
    * @property {string} arrayField The array field name to join with dbField.
*/

/**
    * Options for selectLeftJoin function.
    * @typedef {Object} selectLeftJoinOptions
    * @property {string} leftStoreName Name of the left store.
    * @property {function} [leftFilterFn] Optional function to filter items in the left store.
    * @property {string} leftJoinField Name of the field in the left store's items to join to the right store's items.
    * @property {string} rightStoreName Name of the right store.
    * @property {function} [rightFilterFn] Optional function to filter items in the right store.
    * @property {string} rightJoinField Name of the field in the right store's items to join to the left store's items.
    * @property {function|boolean} transformFnOrSelectDbItemsOnly Optional function to transform each item before adding it to the result array. Or pass true to return just the left items. Or pass null/false to return the left items merged with the matching right items.
    * @property {function|string|array<string>} [orderBy] Either a function to sort items, a string naming 1 field to sort by, an array of strings naming multiple fields to sort by, or true to sort a string array result by default ascii character order.
    * @property {boolean} [sortAscending] Optional Flag specifying whether to sort in ascending order (default) or descending.
*/

/**
    * Options for selectInnerJoin function.
    * @typedef {Object} selectInnerJoinOptions
    * @property {string} leftStoreName Name of the left store.
    * @property {function} [leftFilterFn] Optional function to filter items in the left store.
    * @property {string} leftJoinField Name of the field in the left store's items to join to the right store's items.
    * @property {string} rightStoreName Name of the right store.
    * @property {function} [rightFilterFn] Optional function to filter items in the right store.
    * @property {string} rightJoinField Name of the field in the right store's items to join to the left store's items.
    * @property {function|boolean} transformFnOrSelectDbItemsOnly Optional function to transform each item before adding it to the result array. Or pass true to return just the left items. Or pass null/false to return the left items merged with the matching right items.
    * @property {function|string|array<string>} [orderBy] Either a function to sort items, a string naming 1 field to sort by, an array of strings naming multiple fields to sort by, or true to sort a string array result by default ascii character order.
    * @property {boolean} [sortAscending] Optional Flag specifying whether to sort in ascending order (default) or descending.
*/

/**
 * Performs IndexedDB data CRUD and schema tasks.
 */
var indexedDbSvc = (function () {

    /** @type {string} */
    var _dbName;

    /**
     * ctor
     * @param {string} dbName Name of the database to access
     */
    function indexedDbSvc(dbName) {

        _dbName = dbName;
    }

    /**
     * Gets or sets the name of the database being worked with.
     * @param {string} [dbName] Provide the string name of the database to set the database to work with; provide no value to return the current database name being worked with.
     */
    indexedDbSvc.prototype.dbName = function (dbName) {

        if (typeof (dbName) === "undefined" || dbName == null) {
            return _dbName;
        }
        else {
            _dbName = dbName;
        }
    };

    /**
     * Performs a data query on a store (table). Returns a Promise which is resolved when the async operation completes.
     * @param {string} storeName IndexedDB store (table) name to query.
     * @param {selectOptions} [options] Optional set of options for controlling the results.
     * @returns {Promise} Promise that is resolved when the async query operation completes.
     */
    indexedDbSvc.prototype.select = function (storeName, options) {

        options = options || {};

        /** @type {selectOptions} */
        var opts = {
            indexName: options.indexName,
            keyRange: options.keyRange,
            filterFn: options.filterFn,
            transformFn: options.transformFn,
            orderBy: options.orderBy,
            sortAscending: options.sortAscending,
            returnFirstItemOnly: options.returnFirstItemOnly
        };

        return new Promise(function (resolve, reject) {

            /** @type {IDBOpenDBRequest} */
            var openDbRequest = indexedDB.open(_dbName);

            /** @param {Event} event */
            openDbRequest.onsuccess = function (event) {

                try {
                    /** @type {IDBDatabase} */
                    var db = event.target.result;

                    /** @type {IDBTransaction} */
                    var trans = db.transaction(storeName, "readonly");

                    if (trans) {

                        trans.oncomplete = function () {
                            db.close();
                        };

                        trans.onabort = function (evt) {

                            var storeName = "", keyPath = "", error = "";

                            try {
                                storeName = evt.target.source.name;
                                keyPath = evt.target.source.keyPath;
                                error = evt.target.error;
                            } catch (e) {
                            }

                            var txErr = "indexedDbSvc.select transaction abort at " + storeName + "." + keyPath + ": " + error;
                            console.error(txErr);

                            db.close();

                            reject(txErr);
                        };

                        trans.onerror = function (evt) {

                            var storeName = "", keyPath = "", error = "";

                            try {
                                storeName = evt.target.source.name;
                                keyPath = evt.target.source.keyPath;
                                error = evt.target.error;
                            } catch (e) {
                            }

                            var txErr = "indexedDbSvc.select transaction error at " + storeName + "." + keyPath + ": " + error;
                            console.error(txErr);

                            db.close();

                            reject(txErr);
                        };

                        /** @type {IDBObjectStore} */
                        var objectStore = trans.objectStore(storeName);

                        if (opts.indexName) {
                            /** @type {IDBIndex} */
                            var index;

                            try {
                                index = objectStore.index(opts.indexName);
                            }
                            catch (e) {
                            }
                        }

                        /** @type {IDBKeyRange} */
                        var range;

                        if (opts.keyRange) {
                            try {
                                range = IDBKeyRange.only(opts.keyRange);
                            } catch (e) {
                            }
                        }

                        /** @type {IDBRequest} */
                        var cursorRequest;

                        if (index && range) {
                            cursorRequest = index.openCursor(range);
                        }
                        else if (index) {
                            cursorRequest = index.openCursor();
                        }
                        else if (range) {
                            cursorRequest = objectStore.openCursor(range);
                        }
                        else {
                            cursorRequest = objectStore.openCursor();
                        }

                        /** @type {[]} */
                        var resultItems = [];

                        cursorRequest.onsuccess = function () {

                            /** @type {IDBCursorWithValue} */
                            var cursor = cursorRequest.result;

                            if (cursor) {
                                resultItems.push(cursor.value);
                                cursor.continue();
                            }
                            else {

                                db.close();

                                // filterFn should be something like
                                // function (elementOfArray[, indexInArray]) { return elementOfArray.pr_Deleted == "False"; })

                                // transformFn should be something like
                                // function (valueOfElement) { return new Genus.PriceMatrixRule(valueOfElement); }

                                // Apply filter
                                if (typeof opts.filterFn === "function") {
                                    resultItems = _grep(resultItems, opts.filterFn);
                                }

                                // Apply transform to each element
                                if (typeof opts.transformFn === "function") {
                                    var transformed;
                                    var valueOfElement;

                                    for (var idx = 0; idx < resultItems.length; idx++) {
                                        var valueOfElement = resultItems[idx];
                                        transformed = opts.transformFn.call(null, valueOfElement);
                                        resultItems[idx] = transformed;
                                    }
                                }

                                // Sort
                                if (opts.orderBy != null) {
                                    _sortResultItems(resultItems, opts.orderBy, opts.sortAscending);
                                }

                                if (opts.returnFirstItemOnly) {
                                    // Return just the first result item, which could be null if no results
                                    var first = resultItems[0];
                                    resolve(first);
                                }
                                else {
                                    resolve(resultItems);
                                }
                            }

                            //db.close();
                        };
                    }
                } catch (e) {
                    var err = storeName + " store; " + e.name + "; " + e.message;
                    console.error(err);
                    reject(err);
                }
            };

            /**
             * DB open request on-blocked handler.
             * @param {Event} evt
             */
            openDbRequest.onblocked = function (evt) {

                console.error(evt);
                reject(evt);
            };

            /**
             * DB open request on-error handler.
             * @param {Event} evt
             */
            openDbRequest.onerror = function (evt) {

                console.error(evt);
                reject(evt);
            };

        });

    };

    /**
     * Performs a data query, joining the results to the provided array and returns database items that have a matching item in the array. Returns a Promise which is resolved when the async operation completes.
     * @param {string} storeName Name of the IndexedDB store (table) to query.
     * @param {selectInnerJoinOnArrayOptions} options Set of options for controlling the results.
     * @returns {Promise} Promise that is resolved when the async query operation completes.
     */
    indexedDbSvc.prototype.selectInnerJoinOnArray = function (storeName, options) {

        options = options || {};

        /** @type {selectInnerJoinOnArrayOptions} */
        var opts = {
            storeFilterFn: options.storeFilterFn,
            transformFnOrSelectDbItemsOnly: options.transformFnOrSelectDbItemsOnly,
            orderBy: options.orderBy,
            sortAscending: options.sortAscending,
            joinArray: options.joinArray,
            dbField: options.dbField,
            arrayField: options.arrayField
        };

        var self = this;

        return new Promise(function (resolve, reject) {

            self.select(storeName, { filterFn: opts.storeFilterFn })
                .then(function (dbItems) {

                    var joinedItems = [];
                    var matchingArrayItems;

                    _forEach(dbItems, function (idx, dbItem) {

                        var dbItemFieldValue = dbItem[opts.dbField];

                        matchingArrayItems = _grep(opts.joinArray, function (arrItm) {

                            // Get the array item's field if specified
                            if (opts.arrayField != null) {
                                arrItm = arrItm[opts.arrayField];
                            }

                            return _stringEquals(arrItm, dbItemFieldValue);
                        });

                        if (matchingArrayItems.length > 0) {

                            _forEach(matchingArrayItems, function (idx, arrayItem) {

                                var joinItem;

                                if (typeof opts.transformFnOrSelectDbItemsOnly === "function") {
                                    // Ensure the transform function takes at least 1 argument for the dbItem (it can take a 2nd arg for the joinArray item)
                                    if (opts.transformFnOrSelectDbItemsOnly.length < 1) {
                                        throw new Error("When opts.transformFnOrSelectDbItemsOnly parameter is a function, it must take at least 1 argument for the db item (and optional 2nd arg for the array item)");
                                    }

                                    joinItem = opts.transformFnOrSelectDbItemsOnly.call(null, dbItem, arrayItem);
                                }
                                else if (opts.transformFnOrSelectDbItemsOnly !== true) {
                                    // Merge the first matching array item into the db item
                                    joinItem = _extend({}, dbItem);
                                    joinItem = _extend(joinItem, arrayItem);
                                }
                                else {
                                    // else just select the unmodified dbItem
                                    joinItem = dbItem;
                                }

                                // Add merged object to array of joined items
                                joinedItems.push(joinItem);

                            });
                        }
                    });

                    // Sort
                    if (opts.orderBy != null) {
                        _sortResultItems(joinedItems, opts.orderBy, opts.sortAscending);
                    }

                    // Resolve
                    resolve(joinedItems);
                });

        });
    };

    /**
     * Performs a data query, then left-joins the results to an array and returns at least 1 instance of all database items regardless of them having a matching item in the array, possibly merged with with a matching array item, and possible more instance for subsequent matches.
     * @param {string} storeName Name of the IndexedDB store (table) to query.
     * @param {selectLeftJoinOnArrayOptions} options Set of options for controlling the results.
     * @returns {Promise} Promise that is resolved when the async query operation completes.
     */
    indexedDbSvc.prototype.selectLeftJoinOnArray = function (storeName, options) {

        options = options || {};

        var opts = {
            storeFilterFn: options.storeFilterFn,
            transformFnOrSelectDbItemsOnly: options.transformFnOrSelectDbItemsOnly,
            orderBy: options.orderBy,
            sortAscending: options.sortAscending,
            joinArray: options.joinArray,
            dbField: options.dbField,
            arrayField: options.arrayField
        };

        var self = this;

        return new Promise(function (resolve, reject) {

            self.select(storeName, { filterFn: opts.storeFilterFn })
                .then(function (dbItems) {

                    var joinedItems = [];
                    var matchingArrayItems;

                    _forEach(dbItems, function (idx, dbItem) {

                        var dbItemFieldValue = dbItem[opts.dbField];

                        matchingArrayItems = _grep(opts.joinArray, function (arrItm) {

                            return _stringEquals(arrItm[opts.arrayField], dbItemFieldValue);
                        });

                        if (matchingArrayItems.length > 0) {

                            _forEach(matchingArrayItems, function (idx, arrayItem) {

                                var joinItem;

                                if (typeof opts.transformFnOrSelectDbItemsOnly === "function") {
                                    // Ensure the transform function takes at least 1 argument for the dbItem (it can take a 2nd arg for the joinArray item)
                                    if (opts.transformFnOrSelectDbItemsOnly.length < 1) {
                                        throw new Error("When opts.transformFnOrSelectDbItemsOnly parameter is a function, it must take at least 1 argument for the db item (and optional 2nd arg for the array item)");
                                    }

                                    joinItem = opts.transformFnOrSelectDbItemsOnly.call(null, dbItem, arrayItem);
                                }
                                else if (opts.transformFnOrSelectDbItemsOnly !== true) {
                                    // Merge the first matching array item into the db item
                                    joinItem = _extend({}, dbItem);
                                    joinItem = _extend(joinItem, arrayItem);
                                }
                                else {
                                    // else just select the unmodified dbItem
                                    joinItem = dbItem;
                                }

                                // Add merged object to array of joined items
                                joinedItems.push(joinItem);

                            });
                        }
                        else {
                            // 
                            joinedItems.push(dbItem);
                        }

                    });

                    // Sort
                    if (opts.orderBy != null) {
                        _sortResultItems(joinedItems, opts.orderBy, opts.sortAscending);
                    }

                    // Resolve
                    resolve(joinedItems);
                })
                .catch(reject);
        });
    };

    /**
     * Queries left and right stores (tables), then left-joins the results and returns all matching left store items, optionally merged with any joined right store items.
     * @param {selectLeftJoinOptions} options Set of options for controlling the results.
     */
    indexedDbSvc.prototype.selectLeftJoin = function (options) {

        options = options || {};

        var opts = {
            leftStoreName: options.leftStoreName,
            leftFilterFn: options.leftFilterFn,
            leftJoinField: options.leftJoinField,
            rightStoreName: options.rightStoreName,
            rightFilterFn: options.rightFilterFn,
            rightJoinField: options.rightJoinField,
            transformFnOrSelectDbItemsOnly: options.transformFnOrSelectDbItemsOnly,
            orderBy: options.orderBy,
            sortAscending: options.sortAscending
        };

        var self = this;

        return new Promise(function (resolve, reject) {

            self.select(opts.leftStoreName, { filterFn: opts.leftFilterFn })
                .then(function (leftItems) {

                    return self.select(opts.rightStoreName, opts.rightFilterFn)
                        .then(function (rightItems) {

                            return [leftItems, rightItems];
                        });
                })
                .then(function (leftAndRightItems) {

                    var leftItems = leftAndRightItems[0];
                    var rightItems = leftAndRightItems[1];
                    var joinedItems = [];
                    var matchingRightItems;
                    var leftJoinFieldValue;

                    _forEach(leftItems, function (idx, leftItem) {

                        leftJoinFieldValue = leftItem[opts.leftJoinField];

                        matchingRightItems = _grep(rightItems, function (arrItm) {

                            return _stringEquals(arrItm[opts.rightJoinField], leftJoinFieldValue);
                        });

                        if (matchingRightItems.length > 0) {

                            _forEach(matchingRightItems, function (idx, rightItem) {

                                var itemToAdd = {};

                                if (typeof opts.transformFnOrSelectLeftItemsOnly === "function") {
                                    // Validate that the transform function takes 2 arguments
                                    if (opts.transformFnOrSelectLeftItemsOnly.length !== 2) {
                                        throw new Error("When transformFnOrSelectDbItemsOnly parameter is a function, it must take 2 arguments for the left and right items");
                                    }

                                    itemToAdd = opts.transformFnOrSelectLeftItemsOnly.call(null, leftItem, rightItem);
                                }
                                else if (opts.transformFnOrSelectLeftItemsOnly !== true) {
                                    // Merge the matching right item into a copy of the left item
                                    _extend(itemToAdd, leftItem);
                                    _extend(itemToAdd, rightItem);
                                }
                                else {
                                    // Just select the unmodified leftItem
                                    _extend(itemToAdd, leftItem);
                                }

                                joinedItems.push(itemToAdd);
                            });
                        }
                        else {
                            // Add the left object as-is
                            joinedItems.push(leftItem);
                        }

                    });

                    // Sort
                    if (opts.orderBy != null) {
                        _sortResultItems(joinedItems, opts.orderBy, opts.sortAscending);
                    }

                    // Resolve
                    resolve(joinedItems);

                })
                .catch(function (reason) {

                    console.error("indexedDbSvc.selectLeftJoin - failed " + opts.leftStoreName + " " + opts.rightStoreName);
                    reject(reason);
                });

        });
    };

    /**
     * Queries left and right stores (tables), then joins the results and returns all matching left store items, merged with the joined right store items.
     * @param {selectInnerJoinOptions} options Set of options for controlling the results.
     */
    indexedDbSvc.prototype.selectInnerJoin = function (options) {

        options = options || {};

        var opts = {
            leftStoreName: options.leftStoreName,
            leftFilterFn: options.leftFilterFn,
            leftJoinField: options.leftJoinField,
            rightStoreName: options.rightStoreName,
            rightFilterFn: options.rightFilterFn,
            rightJoinField: options.rightJoinField,
            transformFnOrSelectDbItemsOnly: options.transformFnOrSelectDbItemsOnly,
            orderBy: options.orderBy,
            sortAscending: options.sortAscending
        };

        var self = this;

        return new Promise(function (resolve, reject) {

            self.select(opts.leftStoreName, { filterFn: opts.leftFilterFn })
                .then(function (leftItems) {

                    return self.select(opts.rightStoreName, opts.rightFilterFn)
                        .then(function (rightItems) {

                            return [leftItems, rightItems];
                        });
                })
                .then(function (leftAndRightItems) {

                    var leftItems = leftAndRightItems[0];
                    var rightItems = leftAndRightItems[1];
                    var joinedItems = [];
                    var matchingRightItems;
                    var leftJoinFieldValue;

                    _forEach(leftItems, function (idx, leftItem) {

                        leftJoinFieldValue = leftItem[opts.leftJoinField];

                        matchingRightItems = _grep(rightItems, function (arrItm) {

                            return _stringEquals(arrItm[opts.rightJoinField], leftJoinFieldValue);
                        });

                        if (matchingRightItems.length > 0) {

                            _forEach(matchingRightItems, function (idx, rightItem) {

                                var itemToAdd = {};

                                if (typeof opts.transformFnOrSelectLeftItemsOnly === "function") {
                                    // Validate that the transform function takes 2 arguments
                                    if (opts.transformFnOrSelectLeftItemsOnly.length !== 2) {
                                        throw new Error("When transformFnOrSelectDbItemsOnly parameter is a function, it must take 2 arguments for the left and right items");
                                    }

                                    itemToAdd = opts.transformFnOrSelectLeftItemsOnly.call(null, leftItem, rightItem);
                                }
                                else if (opts.transformFnOrSelectLeftItemsOnly !== true) {
                                    // Merge the matching right item into a copy of the left item
                                    _extend(itemToAdd, leftItem);
                                    _extend(itemToAdd, rightItem);
                                }
                                else {
                                    // Just select the unmodified leftItem
                                    _extend(itemToAdd, leftItem);
                                }

                                joinedItems.push(itemToAdd);
                            });

                        }

                    });

                    // Sort
                    if (opts.orderBy != null) {
                        _sortResultItems(joinedItems, opts.orderBy, opts.sortAscending);
                    }

                    // Resolve
                    resolve(joinedItems);

                })
                .catch(function (reason) {

                    console.error("indexedDbSvc.selectInnerJoin - failed " + opts.leftStoreName + " " + opts.rightStoreName);
                    reject(reason);
                });

        });
    };

    /**
     * Saves data to the given object store.
     * @param {string|ArrayLike<string>} storeName The IndexedDB store/table name.
     * @param {object|ArrayLike} dbData The object(s) to save - a single item; an array of items; an array of item arrays for each store.
     * @returns {Promise} Returns a Promise that is resolved when the async store operation completes.
     */
    indexedDbSvc.prototype.store = function (storeName, dbData) {

        return new Promise(function (resolve, reject) {

            var openDbRequest = indexedDB.open(_dbName);

            openDbRequest.onsuccess = function (evt) {

                try {
                    /** @type {IDBDatabase} */
                    var db = evt.target.result;

                    /** @type {IDBTransaction} */
                    var tx = db.transaction(storeName, "readwrite"); // open tx against the specified table(s)

                    /** @type {IDBObjectStore} */
                    var store = tx.objectStore(storeName);

                    var qtyRowsToStore = 0;

                    // Check for array of items to store
                    if (Array.isArray(dbData)) {
                        // Array of items to store
                        for (var idx = 0; idx < dbData.length; idx++) {
                            try {
                                // Use put versus add to always write, even if exists
                                //console.log("Putting item index " + idx + " into " + storeName + "...");
                                store.put(dbData[idx]);
                                qtyRowsToStore++;
                            } catch (e) {
                                console.error("Error putting data for " + storeName + " - " + e);
                            }
                        }
                    }
                    else {
                        // Single item to store
                        // Use put versus add to always write, even if exists
                        store.put(dbData);
                        qtyRowsToStore = 1;
                    }

                    tx.oncomplete = function (evt) {

                        resolve(qtyRowsToStore); // Signal success and number of rows stored
                        db.close();
                    };

                    tx.onerror = function (evt) {

                        console.error(evt);
                        console.error(storeName);

                        var storeName = "", keyPath = "", error = "";

                        try {
                            storeName = evt.target.source.name;
                            keyPath = evt.target.source.keyPath;
                            error = evt.target.error;
                        } catch (e) {
                        }

                        console.error("indexedDbSvc.Store transaction error at " + storeName + " " + storeName + "." + keyPath + ": " + error);

                        //console.error("Tx error in Store for table " + storeName + " " + error);

                        reject("Store tx error: " + error); // Signal error
                    };

                    tx.onabort = function (evt) {

                        var errorName = "";

                        try {
                            errorName = evt.target.error.name;
                        } catch (e) {
                        }

                        console.error("Store tx aborted for " + storeName + " " + errorName + evt);
                        reject("Store tx aborted"); // Signal error
                    };
                }
                catch (e) {
                    console.error("Store error for " + storeName + e);
                    reject("Store db open exception"); // Signal error
                }
            };

            openDbRequest.onblocked = function (evt) {

                console.error("Store onblocked error for " + storeName + " " + evt);
                reject("Store db open onblocked"); // Signal error
            };

            openDbRequest.onerror = function (evt) {

                console.error("Store onerror for " + storeName + " " + evt);
                reject("Store db open onerror"); // Signal error
            };

        });
    };

    /**
     * Saves data to multiple object stores (tables).
     * @param {ArrayLike} allStoreNamesAndDatas An array of keys (store names) and data values (array or single object) to store in each.
     * @returns {Promise} A Promsie that is resolved when all stores have been written to.
    */
    indexedDbSvc.prototype.storeMany = function (allStoreNamesAndDatas) {

        var self = this;
        var allPromises = [];

        for (var dataIdx = 0; dataIdx < allStoreNamesAndDatas.length; dataIdx++) {

            var nextStoreAndData = allStoreNamesAndDatas[dataIdx];

            allPromises[dataIdx] = new Promise(function (resolve, reject) {

                if (nextStoreAndData[1] !== undefined && (!Array.isArray(nextStoreAndData[1]) || nextStoreAndData[1].length > 0)) {

                    //console.log("indexedDbSvc.StoreMany - storing " + nextTableAndData[0] + "...");

                    self.store(nextStoreAndData[0], nextStoreAndData[1])
                        .then(function (qtyRowsStored) {
                            resolve(qtyRowsStored);
                        })
                        .catch(function (reason) {
                            console.error("indexedDbSvc.StoreMany - failed storing into store " + nextStoreAndData[0]);
                            reject(reason);
                        });
                }
                else {
                    console.warn("indexedDbSvc.StoreMany - no data to store for " + nextStoreAndData[0]);
                    resolve();
                }

            });
        }

        return Promise.all(allPromises);
    };

    /**
     * Deletes from given store the rows whose primary-key index value matches one of the specified values. Returns a Promise which handles the async operation.
     * @param {string} storeName The IndexedDB store/table name.
     * @param {any|ArrayLike<any>} primaryKeyVals A single, or array of, primary key values identifying the rows to delete.
     * @param {string} indexName Optional string name of a particular store index that will be used to identify the rows to delete. Defaults to the store's primary key index.
     * @returns {Promise} Promise that is resolved when the async delete operation completes.
     */
    indexedDbSvc.prototype.delete = function (storeName, indexVals, indexName) {

        var self = this;

        return new Promise(function (resolve, reject) {

            self.getPrimaryKeyName(storeName)
                .then(function (pkName) {

                    indexName = indexName || pkName;

                    var openDbRequest = indexedDB.open(_dbName);

                    openDbRequest.onsuccess = function (evt) {

                        try {
                            /** @type {IDBDatabase} */
                            var db = evt.target.result;
                            var tx = db.transaction(storeName, "readwrite");
                            var store = tx.objectStore(storeName);
                            var index = store.index(indexName);

                            var qtyRowsDeleted = 0;

                            if (!Array.isArray(indexVals)) {
                                // Make an array containing the one item
                                indexVals = [indexVals];
                            }

                            // Put in ascending order so we can form a key range for openCursor
                            indexVals.sort();

                            // Open a cursor spanning the lowest to highest key values - this may include items not specified for deletion
                            var request = index.openCursor(IDBKeyRange.bound(indexVals[0], indexVals[indexVals.length - 1]));

                            request.onsuccess = function () {

                                var cursor = request.result;

                                if (cursor) {

                                    var currentId = request.result.key;

                                    // Delete current item if it is one of the items specified for deletion
                                    if (indexVals.indexOf(currentId) > -1) {
                                        cursor.delete();
                                        qtyRowsDeleted++;
                                    }

                                    cursor.continue(); // Triggers request.onsuccess again
                                }
                            }

                            request.onerror = function () {
                                console.error("Delete openCursor onerror for " + storeName + " " + evt);
                                reject("Delete openCursor error"); // Signal error
                            };

                            tx.oncomplete = function (evt) {
                                resolve(qtyRowsDeleted); // Signal success and number of rows actually deleted
                            };

                            tx.onerror = function (evt) {
                                console.error("Delete tx onerror for " + storeName + " " + evt);
                                reject("Delete tx error"); // Signal error
                            };

                            tx.onabort = function (evt) {
                                console.error("Delete tx abort for " + storeName + " " + evt);
                                reject("Delete tx aborted"); // Signal error
                            };
                        }
                        catch (e) {
                            console.error("Error in Delete for " + storeName + " - " + e);
                            reject("Error in Delete for " + storeName + " - " + e);
                        }
                        finally {
                            db.close();
                        }
                    };

                    openDbRequest.onblocked = function (evt) {

                        console.error("Delete openDbRequest onblocked for " + storeName + " " + evt);
                        reject("Delete openDbRequest onblocked"); // Signal error
                    };

                    openDbRequest.onerror = function (evt) {

                        console.error("Delete openDbRequest onerror for " + storeName + " " + evt);
                        reject("Delete openDbRequest onerror"); // Signal error
                    };

                })
                .catch(function (failReason) {
                    reject(failReason);
                });


        });
    };

    /**
    * Deletes all rows from (truncates) the given store (table). Returns a Promise which handles the async operation.
    * @param {string} storeName The IndexedDB store (table) name.
    * @returns {Promise} Promise that is resolved when the async operation completes.
    */
    indexedDbSvc.prototype.truncate = function (storeName) {

        return new Promise(function (resolve, reject) {

            var openDbRequest = indexedDB.open(_dbName);

            openDbRequest.onsuccess = function (evt) {

                try {
                    /** @type {IDBDatabase} */
                    var db = evt.target.result;
                    var tx;

                    try {
                        tx = db.transaction(storeName, "readwrite");
                    } catch (e) {
                        resolve(0);
                        return;
                    }

                    var store = tx.objectStore(storeName);

                    store.clear();

                    tx.oncomplete = function (evt) {
                        resolve(); // Signal success
                    };

                    tx.onerror = function (evt) {
                        console.error("tx onerror in Truncate for " + storeName + " " + evt);
                        reject("Truncate tx error"); // Signal error
                    };

                    tx.onabort = function (evt) {
                        console.error("tx onabort rrror in Truncate for " + storeName + " " + evt);
                        reject("Truncate tx aborted"); // Signal error
                    };
                }
                catch (e) {
                    console.error("Truncate - error truncating " + storeName + " - " + e);
                    reject();
                }
            };

            openDbRequest.onblocked = function (evt) {

                console.error("Error in Truncate, openDbRequest.onblocked for " + storeName + " " + evt);
                reject("Truncate db open onblocked"); // Signal error
            };

            openDbRequest.onerror = function (evt) {

                console.error("Error in Truncate, openDbRequest.onerror for " + storeName + " " + evt);
                reject("Truncate db open onerror"); // Signal error
            };
        });
    };

    /**
     * Updates an existing record or records.
     * @param {string} storeName Name of the IndexedDB store (table) to update.
     * @param {string|array<string>|function} primaryKeyValsOrFilterFn A single, or array of, primary key values identifying the rows to update, or a function describing which rows to update.
     * @param {object} updateObj An object describing the fields and values to update.
     * @returns {Promise} Promise that is resolved when the async store operation completes.
    */
    indexedDbSvc.prototype.update = function (storeName, primaryKeyValsOrFilterFn, updateObj) {

        var self = this;

        return new Promise(function (resolve, reject) {

            if (typeof primaryKeyValsOrFilterFn === "function") {
                ProceedWithUpdate(primaryKeyValsOrFilterFn);
            }
            else {
                self.getPrimaryKeyName(storeName)
                    .then(function (pkName) {

                        if (typeof primaryKeyValsOrFilterFn === "string") {
                            // Make array of single pk value
                            primaryKeyValsOrFilterFn = [primaryKeyValsOrFilterFn];
                        }

                        // Build filter function
                        var filterFn = function (dbItem) {
                            return _stringArrayContains(primaryKeyValsOrFilterFn, dbItem[pkName]);
                        };

                        ProceedWithUpdate(filterFn);
                    })
                    .catch(function (failReason) {
                        reject("Update failed for " + storeName + "; " + failReason);
                    });
            }

            /**
             * Continues the update operation.
             * @param {Function} filterFn A function describing which rows to update.
             */
            function ProceedWithUpdate(filterFn) {

                // Find the records to update
                self.select(storeName, filterFn)
                    .then(function (itemsToUpdate) {
                        if (itemsToUpdate && itemsToUpdate.length > 0) {

                            // Update the matching records
                            _forEach(itemsToUpdate, function (idx, item) {
                                // Merge the first matching array item into the db item
                                itemsToUpdate[idx] = _extend(itemsToUpdate[idx], updateObj);
                            });

                            // Store in db again
                            self.store(storeName, itemsToUpdate)
                                .then(function () {
                                    // Indicate success and number of rows updated
                                    resolve(itemsToUpdate.length);
                                })
                                .catch(function (failReason) {
                                    reject("Update failed for " + storeName + "; " + failReason);
                                });
                        }
                        else {
                            // Indicate success but zero rows updated
                            resolve(0);
                        }
                    })
                    .catch(function (failReason) {
                        reject("Update failed for " + storeName + "; " + failReason);
                    });
            }
        });
    };

    /**
     * Gets the name of the given store's (table) primary key index.
     * @param {string} storeName The name of the store (table).
     */
    indexedDbSvc.prototype.getPrimaryKeyName = function (storeName) {

        return new Promise(function (resolve, reject) {

            var openDbRequest = indexedDB.open(_dbName);

            /**
             * DB open request on-success handler.
             * @param {Event} event
             */
            openDbRequest.onsuccess = function (event) {

                try {
                    /** @type {IDBDatabase} */
                    var db = event.target.result;

                    /** @type {IDBTransaction} */
                    var trans = db.transaction(storeName, "readonly");

                    var primaryKey;

                    if (trans) {
                        trans.oncomplete = function () {

                            db.close();

                            if (primaryKey) {
                                resolve(primaryKey);
                            }
                            else {
                                reject("PK not found for " + storeName);
                            }

                        };

                        trans.onabort = function (evt) {

                            var storeName = "", keyPath = "", error = "";

                            try {
                                storeName = evt.target.source.name;
                                keyPath = evt.target.source.keyPath;
                                error = evt.target.error;
                            } catch (e) {
                            }

                            var msg = "indexedDbSvc.GetPrimaryKeyName transaction abort at " + storeName + "." + keyPath + ": " + error;
                            console.error(msg);

                            db.close();

                            reject("onabort " + msg);
                        };

                        trans.onerror = function (evt) {

                            var storeName = "", keyPath = "", error = "";

                            try {
                                storeName = evt.target.source.name;
                                keyPath = evt.target.source.keyPath;
                                error = evt.target.error;
                            } catch (e) {
                            }

                            db.close();

                            var msg = "indexedDbSvc.GetPrimaryKeyName transaction error at " + storeName + "." + keyPath + ": " + error;

                            console.error(msg);

                            reject("onerror " + msg);
                        };

                        /** @type {IDBObjectStore} */
                        var objectStore = trans.objectStore(storeName);

                        if (objectStore.indexNames != null) {
                            primaryKey = objectStore.indexNames[0];
                        }
                    }
                    else {

                        reject("Error creating tx to get pk names for store " + storeName + "; " + e.name + "; " + e.message);

                    }
                } catch (e) {
                    console.error(storeName + " store; " + e.name + "; " + e.message);

                    reject("Error getting pk names for store " + storeName + "; " + e.name + "; " + e.message);
                }
            };

            /**
             * DB open request on-blocked handler.
             * @param {Event} evt
             */
            openDbRequest.onblocked = function (evt) {

                console.error(evt);
                reject("onblocked");
            };

            /**
             * DB open request on-error handler.
             * @param {Event} evt
             */
            openDbRequest.onerror = function (evt) {

                console.error(evt);
                reject("onerror");
            };

        });
    };

    /**
     * Determines if an IndexedDB database with given name exists.
     * @param {string} dbName Name of the database to look for.
     * @returns {Promise<boolean>}
     */
    indexedDbSvc.prototype.databaseExists = function (dbName) {

        return new Promise(function (resolve, reject) {

            var databasesRequest = indexedDB.databases();

            databasesRequest.then(function onFulfilled(values) {

                var exists = false;

                _forEach(values, function (idx, db) {
                    if (db.name === dbName) {
                        exists = true;
                        return false; // break
                    }
                });

                resolve(exists);
            });

            databasesRequest.catch(function (reason) {

                console.error("DatabaseExists error for " + dbName + " " + reason);
                resolve(false);
            });
        });
    };

    /**
     * Determines if a store (table) with the given name exists in the current database.
     * @param {string} storeName Name of the sotre (table), e.g. 'Customer'
     * @param {number} [versionNum=1] Optional db version number. 1 is the default value if no value provided.
     */
    indexedDbSvc.prototype.storeExists = function (storeName, versionNum) {

        if (versionNum == null) {
            versionNum = 1;
        }

        return new Promise(function (resolve, reject) {

            /** @type {IDBOpenDBRequest} */
            var openDbRequest = indexedDB.open(_dbName/*, versionNum*/);

            openDbRequest.onsuccess = function (evt) {

                try {
                    /** @type {IDBDatabase} */
                    var db = evt.target.result;

                    if (db.objectStoreNames.contains(storeName)) {
                        db.close();
                        resolve(true)
                    }
                    else {
                        db.close();
                        resolve(false);
                    }
                }
                catch (e) {
                    db.close();
                    console.error("StoreExists - error checking for " + storeName + " - " + e);
                    reject("StoreExists db open onsuccess " + storeName + " - " + e);
                }
            };

            openDbRequest.onblocked = function (evt) {

                console.error("Error in StoreExists, openDbRequest.onblocked " + storeName + " " + evt);
                reject("StoreExists db open onblocked"); // Signal error
            };

            openDbRequest.onerror = function (evt) {

                console.error("Error in StoreExists, openDbRequest.onerror for " + storeName + " " + evt);
                reject("StoreExists db open onerror"); // Signal error
            };

        });

    };

    /**
     * Gets a list of names of all the stores (tables) in the database.
     * @param {any} [versionNum=1] Optional db version number. 1 is the default value if no value provided.
     */
    indexedDbSvc.prototype.fetchAllStores = function (versionNum) {

        if (versionNum == null) {
            versionNum = 1;
        }

        return new Promise(function (resolve, reject) {

            /** @type {IDBOpenDBRequest} */
            var openDbRequest = indexedDB.open(_dbName, versionNum);

            openDbRequest.onsuccess = function (evt) {

                try {
                    /** @type {IDBDatabase} */
                    var db = evt.target.result;

                    resolve(db.objectStoreNames);
                    db.close();
                }
                catch (e) {
                    console.error("FetchAllStores - error checking for " + e);
                    reject("FetchAllStores db open onsuccess  - " + e);
                }
            };

            openDbRequest.onblocked = function (evt) {

                console.error("Error in FetchAllStores, openDbRequest.onblocked " + evt);
                reject("FetchAllStores db open onblocked"); // Signal error
            };

            openDbRequest.onerror = function (evt) {

                console.error("Error in FetchAllStores, openDbRequest.onerror " + evt);
                reject("FetchAllStores db open onerror"); // Signal error
            };
        });
    };

    /** Deletes the current database */
    indexedDbSvc.prototype.deleteDatabase = function () {

        return new Promise(function (resolve, reject) {

            var deleteDbRequest = indexedDB.deleteDatabase(_dbName);

            deleteDbRequest.onblocked = function (event) {
                console.error("blocked deleting database.");
                reject(event);
            };

            deleteDbRequest.onupgradeneeded = function (event) {
                debugger;
            };

            deleteDbRequest.onerror = function (event) {
                console.error("Error deleting database.");
                reject(event);
            };

            deleteDbRequest.onsuccess = function (event) {
                console.log("Database deleted successfully - " + event.returnValue);
                //console.log(event.returnValue); // should be undefined
                resolve(event.returnValue);
            };

        });
    };

    /**
     * Creates an IndexedDB database.
     * @param {number} versionNum
     * @param {any} storeSpecs
     */
    indexedDbSvc.prototype.createDatabase = function (versionNum, storeSpecs) {

        if (versionNum == null) {
            versionNum = 1;
        }

        var self = this;

        return new Promise(function (resolve, reject) {

            /** @type {IDBOpenDBRequest} */
            var openDbRequest = indexedDB.open(_dbName, versionNum);

            var openDbRequestStatus = null;

            console.log("Opening database...");

            openDbRequest.onupgradeneeded = function (event) {

                var db = event.target.result;
                console.log("onupgradeneeded started");

                db.onerror = function (event) {
                    console.error("Error opening database " + event);
                    reject("Error opening database");
                };

                db.onabort = function (event) {
                    console.error("Aborted opening database " + event);
                    reject("Database opening aborted");
                };

                // Create a store (table) for each item
                _forEach(storeSpecs, function (idx, spec) {
                    self.createStore(db, spec.storeName, spec.indexes, spec.addModifiedDataCol);
                });

                openDbRequestStatus = "ok";
                console.log("dbOpenRequest.onupgradeneeded completed");

                resolve();
            };

            openDbRequest.onsuccess = function (event) {

                event.target.result.close();

                if (openDbRequestStatus == "ok") {
                    console.log("dbOpenRequest.onsuccess - ok");
                    resolve();
                }
                else {
                    console.log("dbOpenRequest.onsuccess - upgrading");
                    resolve(); //?
                }
            };

            openDbRequest.onerror = function (event) {
                console.error("error creating database - " + event.target.error.message);
            };

            openDbRequest.onblocked = function (event) {
                console.error("blocked creating database " + event);
            };

        });

    };

    /**
     * Creates a store (table) in the database.
     * @param {IDBDatabase} db The database to add the store to.
     * @param {string} storeName Name of the store to build.
     * @param {any} columnInfo Info about the columns to add to the store.
     * @param {string} pkField Name of the store's primary key column, e.g. 'CustomerID'
     * @param {boolean} addModifiedDataCol If true, also adds a ModifiedData column to the store.
     * @param {string|Array<string>} uniqueKeyPath Optional collection of names of the columns in the store that can only contain unique values.
     */
    indexedDbSvc.prototype.createStore = function (db, storeName, indexes, addModifiedDataCol) {

        var indexesToCreate = [];

        /** @type {IDBObjectStoreParameters} */
        var storeCreationOptions = {
            keyPath: [],
            autoIncrement: false
        };

        _forEach(indexes, function (idx, indexInfo) {

            indexesToCreate.push({
                name: indexInfo.name,
                keypath: indexInfo.name,
                optionalParameters: {
                    unique: indexInfo.isUnique,
                    multiEntry: false
                }
            });

            if (indexInfo.isUnique) {
                storeCreationOptions.keyPath.push(indexInfo.name);
            }
        });

        if (addModifiedDataCol) {
            _addModifiedDataColumn(indexesToCreate);
        }

        var store = db.createObjectStore(storeName, storeCreationOptions);

        _forEach(indexesToCreate, function (idx, indexInfo) {

            store.createIndex(
                indexInfo.name,
                indexInfo.keypath,
                indexInfo.optionalParameters);
        });

        console.log("Created store " + storeName);
    };

    /**
     * Adds a ModifiedData column to the array of store columns.
     * @param {ArrayLike} indexArray
     */
    var _addModifiedDataColumn = function (indexArray) {

        indexArray.push({
            name: "ModifiedData",
            keypath: "ModifiedData",
            optionalParameters: {
                unique: false,
                multiEntry: false
            }
        });
    };

    /**
     * Merges the contents of two or more objects together into the first object. like jQuery $.extend().
     * @param {any} target The object to merge into, or null to start with an empty object.
     * @param {any} source The object to merge from.
     */
    var _extend = function (target, source) {

        target = target || {};

        for (var prop in source) {
            if (typeof source[prop] === 'object') {
                target[prop] = _extend(target[prop], source[prop]);
            } else {
                target[prop] = source[prop];
            }
        }

        return target;
    };

    /**
     * Iterates over an array or an object's properties, executing a function for each item.
     * @param {any} obj The array or object to loop over.
     * @param {Function} callback The function to call for each item. If obj is array-like, callback will be called with i
     */
    var _forEach = function (obj, callback) {
        var length, i = 0;

        if (Array.isArray(obj)) {
            length = obj.length;
            for (; i < length; i++) {
                if (callback.call(obj[i], i, obj[i]) === false) {
                    break;
                }
            }
        } else {
            for (i in obj) {
                if (callback.call(obj[i], i, obj[i]) === false) {
                    break;
                }
            }
        }

        return obj;
    };

    /**
     * Determines if the given value is a string type.
     * @param {any} obj The value to test.
     * @returns {boolean} Returns a value indicating if the value passed in is a string.
     */
    var _isString = function (obj) {

        return typeof obj === "string";
    };

    /**
      * Determines if 2 strings are equal.
      * @param {string} str1 The first string.
      * @param {string} str2 The second string.
      * @param {boolean} [cs] Optional flag indicating whether or not to do a case-sensitive comparison. Default is false (case-insensitive).
      * @param {boolean} [nullEqualsEmpty] Optional flag indicating whether or not to consider null and zero-length strings to be equal. Default is false (not equal).
      * @returns {boolean} True/false indicating if equal or not.
     */
    var _stringEquals = function (str1, str2, cs, nullEqualsEmpty) {

        if (str1 == null && str2 == null) {
            // Both are null - match
            return true;
        }

        if (nullEqualsEmpty === true && (str1 == null || str1 == "") && (str2 == null || str2 == "")) {
            // Null and empty considered equal, and both are null or empty
            return true;
        }

        // One is null, the other isn't - no match
        if (str1 == null || str2 == null) {
            return false;
        }

        // Case-sensitive comparison
        if (cs === true) {
            return str1.toString() == str2.toString();
        }

        // Case-insensitive comparison
        return str1.toString().toLowerCase() == str2.toString().toLowerCase();
    };

    /**
     * Determines if a string array contains a particular string.
     * @param {Array<string>} arr Array of strings to search in.
     * @param {string} str The string to search for.
     * @param {boolean} cs Case-sensitive search. Defaults to false (case-insensitive) if not specified.
     */
    var _stringArrayContains = function (arr, str, cs) {

        if (arr != null) {
            for (var idx = 0; idx < arr.length; idx++) {
                if (stringEquals(arr[idx], str, cs)) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Converts an object to a form that can be sortable.
     * @param {any} obj The object to convert into a sortable form.
     */
    var _objectToSortable = function (obj) {

        if (obj !== null && obj !== undefined && _isString(obj)) {
            return obj.toLowerCase();
        }

        return obj;
    };

    /**
     * Sorts an array of query result items.
     * @param {[]} resultIems The items to sort.
     * @param {function|string|ArrayLike<string>|boolean} orderBy Either a function to sort items, a string naming 1 field to sort by, an array of strings naming multiple fields to sort by, or true to sort a string array result by default ascii character order.
     * @param {bool} [sortAscending] Optional Flag specifying whether to sort in ascending order (default) or descending.
     */
    var _sortResultItems = function (resultIems, orderBy, sortAscending) {

        var self = this;

        // Sort
        if (orderBy != null) {
            if (typeof orderBy === "function") {
                resultIems.sort(orderBy);
            }
            else if (typeof orderBy === "string") {
                var fnSort = function (item1, item2) {
                    return _sortByStringField(orderBy, item1, item2, sortAscending);
                };

                resultIems.sort(fnSort);
            }
            else if (orderBy === true) {
                // Sort string array by ascending ascii character order
                resultItems.sort();
            }
            else if (Array.isArray(orderBy)) {
                resultIems.sort(_sortByMany(orderBy));
            }
        }
    };

    /**
     * Determines the sort order of 2 items.
     * @param {string} fieldName Name of the field to sort the items by.
     * @param {any} item1 First item.
     * @param {any} item2 Second item.
     */
    var _sortByStringField = function (fieldName, item1, item2, sortAscending) {

        if (sortAscending == null) {
            sortAscending = true;
        }

        var item1Field = _objectToSortable(item1[fieldName]);
        var item2Field = _objectToSortable(item2[fieldName]);

        if (item1Field > item2Field) {
            //return 1;
            return sortAscending === true ? 1 : -1;
        }

        if (item2Field > item1Field) {
            //return -1;
            return sortAscending === true ? -1 : 1;
        }

        return 0; // Same    
    };

    /**
    * Pass this to array.sort(fn). Sorts an array by many fields and each in either asc or desc order.
    * @param {ArrayLike} fields An array of field string names and/or sub-arrays of names, direction flag, and conversion functions.
    */
    var _sortByMany = function (fields) {

        var fieldCount = fields.length;

        return function (itemA, itemB) {
            var fieldValueA, fieldValueB, field, key, primer, reverse, result;

            for (var idx = 0, l = fieldCount; idx < l; idx++) {
                result = 0;
                field = fields[idx];

                if (typeof field === 'string') {
                    key = field;
                    reverse = 1;
                }
                else {
                    key = field[0];
                    reverse = (field[1]) ? -1 : 1;
                }

                fieldValueA = itemA[key];
                fieldValueB = itemB[key];

                if (typeof field[2] === "function") {
                    fieldValueA = field[2].call(null, fieldValueA);
                    fieldValueB = field[2].call(null, fieldValueB);
                }

                if (fieldValueA < fieldValueB) {
                    result = reverse * -1;
                }

                if (fieldValueA > fieldValueB) {
                    result = reverse * 1;
                }

                if (result !== 0) {
                    break;
                }
            }

            return result;
        }
    };

    /**
    * Filters the items in an array, like $.grep.
    * @param {Array<any>} arr Array to be filtered.
    * @param {function} filterFn Predicate function to filter items with, should return bool.
    * @param {boolean} [returnFirstItemOnly] Optional flag specifying whether to return only the first matching item as a single object or, if no matches, to return null. Otherwise an array of all matching items is returns.
    * @return {[]|object}
    */
    var _grep = function (arr, filterFn, returnFirstItemOnly) {

        if (typeof filterFn !== "function") {
            // Default to finding all items
            filterFn = function () { return true; };
        }

        var filteredItems = [];
        var obj;
        var isMatch;
        var idx;

        for (idx = 0; idx < arr.length; idx++) {
            obj = arr[idx];
            isMatch = filterFn.call(null, obj) === true;

            if (isMatch) {
                if (returnFirstItemOnly) {
                    // Skip the rest
                    return obj;
                }

                filteredItems.push(obj);
            }
        }

        if (returnFirstItemOnly && filteredItems.length === 0) {
            return null;
        }

        return filteredItems;
    };

    // Return the instantiated 'class'
    return indexedDbSvc;

}());
