
/*jslint
    this: true, for: true, white: true
*/

/// <reference path="../../jQuery/jquery.js" />
/// <reference path="../Misc.js" />

/**
 * Performs IndexedDB data CRUD tasks.
 */
var IndexedDbSvc = (function () {

    function DbQuerySvc() {

    }

    var ObjectToSortable = function (obj) {

        if (obj !== null && obj !== undefined && IsString(obj)) {
            return obj.toLowerCase();
        }

        return obj;
    };

    /**
     * Does the low-level work of querying IndexedDB.
     * @param {string} dbName
     * @param {string} dbTableName
     * @param {string} indexName
     * @param {any} keyRange
     * @param {function} callBackFunction
     * @param {any} callBackArgs
     */
    var _queryIndexedDB = function (dbName, dbTableName, indexName, keyRange, callBackFunction, callBackArgs) {

        /**
         * @type {IDBOpenDBRequest}
         */
        var openDbRequest = window.indexedDB.open(dbName);

        /**
         * 
         * @param {Event} event
         */
        openDbRequest.onsuccess = function (event) {

            try {
                /**
                 * @type {IDBDatabase}
                 */
                var db = event.target.result;

                /**
                 * @type {IDBTransaction}
                 */
                var trans = db.transaction(dbTableName, "readonly");

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

                        console.error("DbQuerySvc._queryIndexedDB transaction abort at " + storeName + "." + keyPath + ": " + error);

                        db.close();
                    };

                    trans.onerror = function (evt) {

                        var storeName = "", keyPath = "", error = "";

                        try {
                            storeName = evt.target.source.name;
                            keyPath = evt.target.source.keyPath;
                            error = evt.target.error;
                        } catch (e) {
                        }

                        console.error("DbQuerySvc._queryIndexedDB transaction error at " + storeName + "." + keyPath + ": " + error);

                        db.close();
                    };

                    /**
                     * @type {IDBObjectStore}
                     */
                    var objectStore = trans.objectStore(dbTableName);

                    if (indexName) {
                        /**
                         * @type {IDBIndex}
                         */
                        var index;

                        try {
                            index = objectStore.index(indexName);
                        }
                        catch (e) {
                        }
                    }

                    /**
                     * @type {IDBKeyRange}
                     */
                    var range;

                    if (keyRange) {
                        try {
                            range = IDBKeyRange.only(keyRange);
                        } catch (e) {
                        }
                    }

                    /**
                     * @type {IDBRequest}
                     */
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

                    /**
                     * @type {[]}
                     */
                    var results = [];

                    cursorRequest.onsuccess = function () {

                        /**
                         * @type {IDBCursorWithValue}
                         */
                        var cursor = cursorRequest.result;

                        if (cursor) {
                            results.push(cursor.value);
                            cursor.continue();
                        }
                        else if (typeof callBackFunction === "function") {
                            callBackFunction.call(null, results, callBackArgs);
                        }
                    };
                }
            } catch (e) {
                console.error(dbTableName + " table; " + e.name + "; " + e.message);

                if (typeof callBackFunction === "function") {
                    callBackFunction.call(null, null, e.name, callBackArgs);
                }
            }
        };

        /**
         * DB open request on-blocked handler.
         * @param {Event} evt
         */
        openDbRequest.onblocked = function (evt) {

            console.error(evt);
        };

        /**
         * DB open request on-error handler.
         * @param {Event} evt
         */
        openDbRequest.onerror = function (evt) {

            console.error(evt);
        };
    };

    /**
     * Performs a data query. Returns a deferred which is resolved when the async operation completes.
     * @param {string} dbName IndexedDB database name.
     * @param {string} dbTableName IndexedDB store name to query.
     * @param {function} [filterFn] Optional function to filter items in the store being queried.
     * @param {function} [transformFn] Optional function to transform each item before adding it to the result array. Pass null to return the original item.
     * @param {function|string|array<string>|boolean} [orderBy] Optional either a function to sort items, a string naming 1 field to sort by, or an array of strings naming multiple fields to sort by, or true to sort string array by default ascii character order.
     * @param {boolean} [returnFirstItemOnly] Pass true to have just the first result item returned; otherwise an array containing all results is returned.
     * @returns {promise} Promise of a deferred that is resolved when the async query operation completes.
     */
    DbQuerySvc.prototype.QueryDeferred = function (dbName, dbTableName, filterFn, transformFn, orderBy, returnFirstItemOnly) {

        var self = this;
        var deferred = $.Deferred();

        /**
         * Function to be called when the async DB query operation completes.
         * @param {[]} resultItems Array of database 'rows'.
         * @param {string} [errorMsg] Optional error msg if something went wrong.
         */
        var callBackFunction = function (resultItems, errorMsg) {

            if (!StringIsNullOrEmpty(errorMsg)) {
                deferred.reject(errorMsg);
                return;
            }

            // filterFn should be something like
            // function (elementOfArray[, indexInArray]) { return elementOfArray.pr_Deleted == "False"; })

            // transformFn should be something like
            // function (valueOfElement) { return new Genus.PriceMatrixRule(valueOfElement); }

            //var jsonArray = JSON.parse(JSON.stringify(response)); // Seems to work without this?
            //var jsonArray = resultItems;

            // Apply filter
            if (typeof filterFn === "function") {
                resultItems = grep(resultItems, filterFn);
            }

            // Apply transform to each element
            if (typeof transformFn === "function") {
                var transformed;

                $.each(resultItems, function (indexInArray, valueOfElement) {
                    transformed = transformFn.call(null, valueOfElement);
                    resultItems[indexInArray] = transformed;
                });
            }

            // Sort
            if (orderBy != null) {
                self.SortResultItems(resultItems, orderBy);
            }

            if (returnFirstItemOnly) {
                // Return just the first result item
                var first = resultItems[0];
                deferred.resolve(first);
            }
            else {
                deferred.resolve(resultItems);
            }
        };

        _queryIndexedDB(dbName, dbTableName, null, null, callBackFunction);

        return deferred.promise();
    };

    /**
     * Performs a data query, joining the results to the provided array and returns database items that have a matching item in the array. Returns a deferred which is resolved when the async operation completes.
     * @param {string} dbName IndexedDB database name.
     * @param {string} dbTableName IndexedDB store name to query.
     * @param {function} [filterFn] Optional function to filter items in the store being queried.
     * @param {function|Boolean|null} [transformFnOrSelectDbItemsOnly] Optional function to transform each database and matching array item before adding it to the result array. Or pass true to return just the database items. Or pass null/false to return database items merged with the matching array item.
     * @param {function|string|Array<string>|null} [orderBy] Optional either a function to sort items, a string naming 1 field to sort by, or an array of strings naming multiple fields to sort by. Sorting is performed on the joined items.
     * @param {Array} joinArray The array to join to.
     * @param {string} dbField The database field name to join with arrayField.
     * @param {string} [arrayField] The array field name to join with dbField. Ignore this param if you want to compare against array items themselves, e.g. array of int IDs.
     * @returns {promise} Promise of a deferred that is resolved when the async query operation completes.
     */
    DbQuerySvc.prototype.QueryInnerJoinDeferred = function (dbName, dbTableName, filterFn, transformFnOrSelectDbItemsOnly, orderBy, /*returnFirstItemOnly,*/ joinArray, dbField, arrayField) {

        var self = this;
        var deferred = $.Deferred();

        self.QueryDeferred(dbName, dbTableName, filterFn)
            .done(function (dbItems) {

                var joinedItems = [];
                var matchingArrayItems;

                $.each(dbItems, function (idx, dbItem) {

                    var dbItemFieldValue = dbItem[dbField];

                    matchingArrayItems = grep(joinArray, function (arrItm) {

                        // Get the array item's field if specified
                        if (arrayField != null) {
                            arrItm = arrItm[arrayField];
                        }

                        return StringEquals(arrItm, dbItemFieldValue);
                    });

                    if (matchingArrayItems.length > 0) {

                        if (typeof transformFnOrSelectDbItemsOnly === "function") {
                            // Ensure the transform function takes at least 1 argument for the dbItem (it can take a 2nd arg for the joinArray item)
                            if (transformFnOrSelectDbItemsOnly.length < 1) {
                                throw new Error("When transformFnOrSelectDbItemsOnly parameter is a function, it must take at least 1 argument for the db item (and optional 2nd arg for the array item)");
                            }

                            dbItem = transformFnOrSelectDbItemsOnly.call(null, dbItem, matchingArrayItems[0]);
                        }
                        else if (transformFnOrSelectDbItemsOnly !== true) {
                            // Merge the first matching array item into the db item
                            $.extend(dbItem, matchingArrayItems[0]);
                        }
                        // else just select the unmodified dbItem

                        // Add merged object to array of joined items
                        joinedItems.push(dbItem);
                    }
                });

                // Sort
                self.SortResultItems(joinedItems, orderBy);

                // Resolve
                deferred.resolve(joinedItems);
            });

        return deferred.promise();
    };

    /**
     * Performs a data query, then left-joins the results to another array and returns all database items regardless of them having a matching item in the array.
     * @param {string} dbName IndexedDB database name.
     * @param {string} dbTableName IndexedDB store name to query.
     * @param {function} filterFn Optional function to filter items in the store being queried.
     * @param {function|boolean} transformFnOrSelectDbItemsOnly Optional function to transform each database and array before adding it to the result array. Or pass true to return just the database items. Or pass null/false to return database items merged with the matching array item.
     * @param {function|string|array<string>} orderBy Optional either a function to sort items, a string naming 1 field to sort by, or an array of strings naming multiple fields to sort by. Sorting is performed on the joined items.
     * @param {array} joinArray The array to join to.
     * @param {string} dbField The database field name to join with arrayField.
     * @param {string} arrayField The array field name to join with dbField.
     * @returns {promise} Promise of a deferred that is resolved when the async query operation completes.
     */
    DbQuerySvc.prototype.QueryLeftJoinDeferred = function (dbName, dbTableName, filterFn, transformFnOrSelectDbItemsOnly, orderBy, joinArray, dbField, arrayField) {

        var self = this;
        var deferred = $.Deferred();

        this.QueryDeferred(dbName, dbTableName, filterFn)
            .done(function (dbItems) {

                var joinedItems = [];
                var matchingArrayItems;

                $.each(dbItems, function (idx, dbItem) {

                    var dbItemFieldValue = dbItem[dbField];

                    matchingArrayItems = grep(joinArray, function (arrItm) {

                        return StringEquals(arrItm[arrayField], dbItemFieldValue);
                    });

                    if (matchingArrayItems.length > 0) {

                        if (typeof transformFnOrSelectDbItemsOnly === "function") {
                            // Validate transform function takes 2 arguments
                            if (transformFnOrSelectDbItemsOnly.length !== 2) {
                                throw new Error("When transformFnOrSelectDbItemsOnly parameter is a function, it must take 2 arguments for the db item and array item");
                            }

                            dbItem = transformFnOrSelectDbItemsOnly.call(null, dbItem, matchingArrayItems[0]);
                        }
                        else if (transformFnOrSelectDbItemsOnly !== true) {
                            // Merge the first matching array item into the db item
                            $.extend(dbItem, matchingArrayItems[0]);
                        }
                        // else just select the unmodified dbItem
                    }

                    // Add object (whether it's been merged with a matching array item or not) to array of joined items
                    joinedItems.push(dbItem);
                });

                // Sort
                self.SortResultItems(joinedItems, orderBy);

                // Resolve
                deferred.resolve(joinedItems);
            });

        return deferred.promise();
    };

    /**
     * Sorts an array of query result items.
     * @param {[]} resultIems The items to sort.
     * @param {function|string|array<string>|boolean} orderBy Either a function to sort items, a string naming 1 field to sort by, or an array of strings naming multiple fields to sort by, or true to sort string array by default ascii character order.
     */
    DbQuerySvc.prototype.SortResultItems = function (resultIems, orderBy) {

        var self = this;

        // Sort
        if (orderBy != null) {
            if (typeof orderBy === "function") {
                resultIems.sort(orderBy);
            }
            else if (typeof orderBy === "string") {
                var fnSort = function (item1, item2) {
                    return self.SortByStringField(orderBy, item1, item2);
                };

                resultIems.sort(fnSort);
            }
            else if (orderBy === true) {
                // Sort string array by ascending ascii character order
                resultItems.sort();
            }
            else if (Array.isArray(orderBy)) {
                resultIems.sort(self.SortByMany(orderBy));
            }
        }
    };

    /**
     * Saves data to the given object store.
     * @param {string} dbName The IndexedDB database name.
     * @param {string|Array<string>} dbTable The IndexedDB store/table name.
     * @param {object|Array} dbData The object(s) to save - a single item; an array of items; an array of item arrays for each dbTable.
     * @returns {promise} Returns a Promise that is resolved when the async store operation completes.
     */
    DbQuerySvc.prototype.StoreDeferred = function (dbName, dbTable, dbData) {

        // todo - re-engineer this lot to handle dbTable param being an array of tables (e.g. header and line) and dbData param being an array of the same size where each dbData member is either a single object (row), or an array of objects (rows) to store in the corresponding table

        var deferred = $.Deferred();
        var openDbRequest = window.indexedDB.open(dbName);

        CheckHaveUnSentData(true);

        openDbRequest.onsuccess = function (evt) {

            try {
                /**
                 * @type {IDBDatabase}
                 */
                var db = evt.target.result;

                /**
                 * @type {IDBTransaction}
                 */
                var tx = db.transaction(dbTable, "readwrite"); //  open tx against the specified table(s)

                /**
                 * @type {IDBObjectStore}
                 */
                var store = tx.objectStore(dbTable);

                // Check for array of items to store
                if (Array.isArray(dbData)) {
                    // Array of items to store
                    for (var idx = 0; idx < dbData.length; idx++) {
                        try {
                            // Use put versus add to always write, even if exists
                            //console.log("Putting item index " + idx + " into " + dbTable + "...");
                            store.put(dbData[idx]);
                        } catch (e) {
                            console.error("Error putting data for " + dbTable + " - " + e);
                        }
                    }
                }
                else {
                    // Single item to store
                    // Use put versus add to always write, even if exists
                    store.put(dbData);
                }

                tx.oncomplete = function (evt) {

                    deferred.resolve(); // Signal success
                };

                tx.onerror = function (evt) {

                    console.error(evt);
                    console.error(dbTable);

                    var storeName = "", keyPath = "", error = "";

                    try {
                        storeName = evt.target.source.name;
                        keyPath = evt.target.source.keyPath;
                        error = evt.target.error;
                    } catch (e) {
                    }

                    console.error("DbQuerySvc.StoreDeferred transaction error at " + storeName + " " + dbTable + "." + keyPath + ": " + error);

                    //console.error("Tx error in StoreDeferred for table " + dbTable + " " + error);

                    deferred.reject("StoreDeferred tx error: " + error); // Signal error
                };

                tx.onabort = function (evt) {

                    var errorName = "";

                    try {
                        errorName = evt.target.error.name;
                    } catch (e) {
                    }

                    console.error(evt);
                    console.error(dbTable);
                    alert("Tx aborted in StoreDeferred for table " + dbTable + " " + errorName); //Temporary alert until sort out what to do with error here
                    deferred.reject("StoreDeferred tx aborted"); // Signal error
                };
            }
            catch (e) {
                console.error(e);
                console.error(dbTable);
                alert("Error in StoreDeferred"); //Temporary alert until sort out what to do with error here
                deferred.reject("StoreDeferred db open exception"); // Signal error
            }
        };

        openDbRequest.onblocked = function (evt) {

            console.error(evt);
            alert("Error in Load onblocked"); //Temporary alert until sort out what to do with error here    
            deferred.reject("StoreDeferred db open onblocked"); // Signal error
        };

        openDbRequest.onerror = function (evt) {

            console.error(evt);
            alert("Error in Load request onerror"); //Temporary alert until sort out what to do with error here
            deferred.reject("StoreDeferred db open onerror"); // Signal error
        };

        return deferred.promise();
    };

    /**
     * Saves data to multiple object stores.
     * @param {string} dbName The IndexedDB database name.
     * @param {array} allTableNamesAndDbDatas 2D array of table names and the data to save in each.
     * @param {number} nextIdx The index in {allTableNamesAndDbDatas} to handle on this iteration.
     * @param {promise} defCompleted A deferred that is resolved when the last table is written to.
     * @returns {void} This method calls itself recursively, then resolves the provided deferred when completed.
    */
    DbQuerySvc.prototype.StoreManyDeferred = function (dbName, allTableNamesAndDbDatas, nextIdx, defCompleted) {

        var self = this;
        var nextItem = allTableNamesAndDbDatas[nextIdx];

        CheckHaveUnSentData(true);

        if (nextItem !== undefined) {

            if (nextItem[1] !== undefined && (!Array.isArray(nextItem[1]) || nextItem[1].length > 0)) {

                //console.log("DbQuerySvc.StoreManyDeferred - storing " + nextItem[0] + "...");

                self.StoreDeferred(dbName, nextItem[0], nextItem[1])
                    .done(function () {
                        // Recursive call for next item
                        self.StoreManyDeferred(dbName, allTableNamesAndDbDatas, nextIdx + 1, defCompleted);
                    })
                    .fail(function (failReason) {
                        console.error("DbQuerySvc.StoreManyDeferred - failed storing into " + nextItem[0]);
                        defCompleted.reject(failReason);
                    });
            }
            else {
                console.warn("DbQuerySvc.StoreManyDeferred - no data to store for " + nextItem[0]);
                self.StoreManyDeferred(dbName, allTableNamesAndDbDatas, nextIdx + 1, defCompleted);
            }
        }
        else {
            // All have been stored
            defCompleted.resolve();
        }
    };

    /**
     * Deletes from given store the rows whose primary-key index value matches one of the specified values. Returns a deferred which handles the async operation.
     * @param {string} dbName The IndexedDB database name.
     * @param {string} dbTable The IndexedDB store/table name.
     * @param {any|array<any>} primaryKeyVals A single, or array of, primary key values identifying the rows to delete.
     * @returns {promise} Promise of a deferred that is resolved when the async store operation completes.
     */
    DbQuerySvc.prototype.DeleteDeferred = function (dbName, dbTable, /*indexName,*/ primaryKeyVals) {

        var deferred = $.Deferred();
        var openDbRequest = window.indexedDB.open(dbName);

        CheckHaveUnSentData(true);

        openDbRequest.onsuccess = function (evt) {

            try {
                var db = evt.target.result;
                var tx = db.transaction(dbTable, "readwrite");
                var store = tx.objectStore(dbTable);
                //var index = store.index(indexName);
                //var delReq;

                if (!Array.isArray(primaryKeyVals)) {
                    // Make array of 1 item
                    primaryKeyVals = [primaryKeyVals];
                }

                // Delete the row for each key
                $.each(primaryKeyVals, function (idx, keyVal) {
                    store.delete(keyVal);
                });

                tx.oncomplete = function (evt) {
                    deferred.resolve(); // Signal success
                };

                tx.onerror = function (evt) {
                    console.error(evt);
                    alert("Error in DeleteDeferred onerror");
                    deferred.reject("DeleteDeferred tx error"); // Signal error
                };

                tx.onabort = function (evt) {
                    console.error(evt);
                    alert("Error in DeleteDeferred abort");
                    deferred.reject("DeleteDeferred tx aborted"); // Signal error
                };
            }
            catch (e) {
                console.error("DeleteDeferred - error deleting from " + dbTable + " - " + e);
                alert("Error in DeleteDeferred for table " + dbTable);
                deferred.reject();
            }
        };

        openDbRequest.onblocked = function (evt) {

            console.error(evt);
            alert("Error in DeleteDeferred, openDbRequest.onblocked " + evt); //Temporary alert until sort out what to do with error here
            deferred.reject("DeleteDeferred db open onblocked"); // Signal error
        };

        openDbRequest.onerror = function (evt) {

            console.error(evt);
            alert("Error in DeleteDeferred, openDbRequest.onerror " + evt); //Temporary alert until sort out what to do with error here
            deferred.reject("DeleteDeferred db open onerror"); // Signal error
        };

        return deferred.promise();
    };

    /**
     * Updates an existing record or records.
     * @param {string} dbName The IndexedDB database name.
     * @param {string} dbTable The IndexedDB store/table name.
     * @param {string|array<string>|function} primaryKeyValsOrFilterFn A single, or array of, primary key values identifying the rows to update, or a function describing which rows to update.
     * @param {object} updateObj An object describing the fields and values to update.
     * @returns {promise} Promise of a deferred that is resolved when the async store operation completes.
    */
    DbQuerySvc.prototype.UpdateDeferred = function (dbName, dbTableName, primaryKeyValsOrFilterFn, updateObj) {

        var self = this;
        var deferred = $.Deferred();

        CheckHaveUnSentData(true);

        if (typeof primaryKeyValsOrFilterFn === "function") {
            ProceedWithUpdate(primaryKeyValsOrFilterFn);
        }
        else {
            self.GetPrimaryKeyNameDeferred(dbName, dbTableName)
                .done(function (pkName) {

                    if (typeof primaryKeyValsOrFilterFn === "string") {
                        // Make array of single pk value
                        primaryKeyValsOrFilterFn = [primaryKeyValsOrFilterFn];
                    }

                    // Build filter function
                    var filterFn = function (dbItem) {
                        return StringArrayContains(primaryKeyValsOrFilterFn, dbItem[pkName]);
                    };

                    ProceedWithUpdate(filterFn);
                })
                .fail(function (failReason) {
                    deferred.reject("UpdateDeferred failed for " + dbTableName + "; " + failReason);
                });
        }

        /**
         * Continues the update operation.
         * @param {Function} filterFn A function describing which rows to update.
         */
        function ProceedWithUpdate(filterFn) {

            // Find the records to update
            self.QueryDeferred(dbName, dbTableName, filterFn)
                .done(function (itemsToUpdate) {
                    if (itemsToUpdate && itemsToUpdate.length > 0) {

                        // Update the matching records
                        $.each(itemsToUpdate, function (idx, item) {
                            itemsToUpdate[idx] = $.extend(itemsToUpdate[idx], updateObj);
                        });

                        // Store in db again
                        self.StoreDeferred(dbName, dbTableName, itemsToUpdate)
                            .done(function () {
                                // Indicate success and number of rows updated
                                deferred.resolve(itemsToUpdate.length);
                            })
                            .fail(function (failReason) {
                                deferred.reject("UpdateDeferred failed for " + dbTableName + "; " + failReason);
                            });
                    }
                    else {
                        // Indicate success but zero rows updated
                        deferred.resolve(0);
                    }
                })
                .fail(function (failReason) {
                    deferred.reject("UpdateDeferred failed for " + dbTableName + "; " + failReason);
                });
        }

        return deferred.promise();
    };

    /**
     * Gets the name of the given table's primary key index.
     * @param {string} dbName Database name.
     * @param {string} dbTableName Table name.
     */
    DbQuerySvc.prototype.GetPrimaryKeyNameDeferred = function (dbName, dbTableName) {

        var deferred = $.Deferred();

        var openDbRequest = indexedDB.open(dbName);

        /**
         * DB open request on-success handler.
         * @param {Event} event
         */
        openDbRequest.onsuccess = function (event) {

            try {
                /**
                 * @type {IDBDatabase}
                 */
                var db = event.target.result;

                /**
                 * @type {IDBTransaction}
                 */
                var trans = db.transaction(dbTableName, "readonly");

                var primaryKey;

                if (trans) {
                    trans.oncomplete = function () {

                        db.close();

                        if (primaryKey) {
                            deferred.resolve(primaryKey);
                        }
                        else {
                            deferred.reject("PK not found for " + dbTableName);
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

                        var msg = "DbQuerySvc.GetPrimaryKeyNameDeferred transaction abort at " + storeName + "." + keyPath + ": " + error;
                        console.error(msg);

                        db.close();

                        deferred.reject("onabort " + msg);
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

                        var msg = "DbQuerySvc.GetPrimaryKeyNameDeferred transaction error at " + storeName + "." + keyPath + ": " + error;

                        console.error(msg);

                        deferred.reject("onerror " + msg);
                    };

                    /**
                     * @type {IDBObjectStore}
                     */
                    var objectStore = trans.objectStore(dbTableName);

                    if (objectStore.indexNames != null) {
                        primaryKey = objectStore.indexNames[0];
                    }
                }
            } catch (e) {
                console.error(dbTableName + " table; " + e.name + "; " + e.message);

                deferred.reject("Error getting pk names for " + dbTableName + "; " + e.name + "; " + e.message);
            }
        };

        /**
         * DB open request on-blocked handler.
         * @param {Event} evt
         */
        openDbRequest.onblocked = function (evt) {

            console.error(evt);
            deferred.reject("onblocked");
        };

        /**
         * DB open request on-error handler.
         * @param {Event} evt
         */
        openDbRequest.onerror = function (evt) {

            console.error(evt);
            deferred.reject("onerror");
        };

        return deferred.promise();
    };

    /**
     * Determines the sort order of 2 items.
     * @param {string} fieldName Name of the field to sort the items by.
     * @param {any} item1 First item.
     * @param {any} item2 Second item.
     */
    DbQuerySvc.prototype.SortByStringField = function (fieldName, item1, item2) {

        var self = this;

        var item1Field = ObjectToSortable(item1[fieldName]);
        var item2Field = ObjectToSortable(item2[fieldName]);

        if (item1Field > item2Field)
            return 1;

        if (item2Field > item1Field)
            return -1;

        return 0; // Same    

    };

    /**
    Pass this to array.sort(fn). Sorts an array by many fields and each in either asc or desc order.
    @param {array} fields An array of field string names and/or sub-arrays of names, direction flag, and conversion functions.
    */
    DbQuerySvc.prototype.SortByMany = function (fields) {

        var n_fields = fields.length;

        return function (itemA, itemB) {
            var fieldValueA, fieldValueB, field, key, primer, reverse, result;

            for (var i = 0, l = n_fields; i < l; i++) {
                result = 0;
                field = fields[i];

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

                if (fieldValueA < fieldValueB) result = reverse * -1;
                if (fieldValueA > fieldValueB) result = reverse * 1;
                if (result !== 0) break;
            }

            return result;
        }
    };

    // Return the instantiated 'class'
    return DbQuerySvc;

}());
