/// <reference path="../src/services/indexeddbsvc.js" />

describe("indexedDbSvc", function () {

    const dbName = "JasmineDemo";
    const _indexedDbSvc = new indexedDbSvc(dbName);
    jasmine.getEnv().configure({ random: false });

    const storeSpecs = [
        {
            storeName: "Customer",
            indexes: [
                { name: "CustomerID", isUnique: true },
                { name: "CustomerRef", isUnique: true },
                { name: "CustomerName", isUnique: false }
            ],
            addModifiedDataCol: true
        },
        {
            storeName: "Policy",
            indexes: [
                { name: "PolicyID", isUnique: true },
                { name: "PolicyRef", isUnique: true },
                { name: "CustomerID", isUnique: false }
            ],
            addModifiedDataCol: true
        },
    ];

    //beforeAll(function () {

    //    return _indexedDbSvc.deleteDatabase()
    //        .then(function () {

    //            return _indexedDbSvc.createDatabase(1, storeSpecs);
    //        });
    //});

    beforeEach(function () {

        return _indexedDbSvc.deleteDatabase()
            .then(function () {

                return _indexedDbSvc.createDatabase(1, storeSpecs);
            });
    });

    describe("databaseExists", function () {

        it("should return false when called with non-existant database name", function () {

            var randomDbName = "foo" + new Date().getTime(); // e.g. 'foo1631137489664'

            return _indexedDbSvc.databaseExists(randomDbName)
                .then(function (exists) {
                    expect(exists).toBeFalse();
                });

        });

        it("should return true when called with existing database name (DoneFn, all browsers)", function (doneFn) {

            _indexedDbSvc.databaseExists(dbName)
                .then(function (exists) {
                    expect(exists).toBeTrue();

                    doneFn();
                });
        });

        it("should return true when called with existing database name (Promise, none-IE browsers)", function () {

            return _indexedDbSvc.databaseExists(dbName)
                .then(function (exists) {
                    expect(exists).toBeTrue();
                });
        });

        it('should return true when called with existing database name (async, none-IE browsers)', async function () {

            const exists = await _indexedDbSvc.databaseExists(dbName);
            expect(exists).toBeTrue();
        });

    });

    describe("storeExists", function () {

        it("should return false when called with non-existant store name", function () {

            var randomStoreName = "foo" + new Date().getTime();

            return _indexedDbSvc.storeExists(randomStoreName)
                .then(function (exists) {
                    expect(exists).toBeFalse();
                });

        });

        it("should return true when called with existing store name", function () {

            var existingStoreName = "Customer";

            return _indexedDbSvc.storeExists(existingStoreName)
                .then(function (exists) {
                    expect(exists).toBeTrue();
                });

        });
    });

    describe("store", function () {

        it("should store a single item in the given store", function () {

            var customer = { CustomerID: 123, CustomerRef: "CUST003", CustomerName: "A Test" };

            return _indexedDbSvc.store("Customer", customer).
                then(function (qtyRowsStored) {
                    expect(qtyRowsStored).toEqual(1);
                });
        });

        it("should store multiple items in the given store", function () {

            var customers = [
                { CustomerID: 124, CustomerRef: "CUST004", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST005", CustomerName: "C Test" }
            ];

            return _indexedDbSvc.store("Customer", customers).
                then(function (qtyRowsStored) {
                    expect(qtyRowsStored).toEqual(2);
                });
        });
    });

    describe("storeMany", function () {

        it("should store in a single table", function () {

            var data = [["Customer", { CustomerID: 126, CustomerRef: "CUST006", CustomerName: "D Test" }]];

            return _indexedDbSvc.storeMany(data).
                then(function (allQuantitiesStored) {

                    var totalRows = 0;
                    for (var idx = 0; idx < allQuantitiesStored.length; idx++) {
                        totalRows += allQuantitiesStored[idx];
                    }

                    expect(totalRows).toEqual(1);
                });
        });

        it("should store in multiple tables", function () {

            var data = [
                ["Customer",
                    { CustomerID: 127, CustomerRef: "CUST007", CustomerName: "E Test" }
                ],
                ["Policy", [
                    { PolicyID: 124, PolicyRef: "POL001", CustomerID: 127 },
                    { PolicyID: 125, PolicyRef: "POL002", CustomerID: 127 }
                ]]
            ];

            return _indexedDbSvc.storeMany(data).
                then(function (allQuantitiesStored) {

                    var totalRows = 0;
                    for (var idx = 0; idx < allQuantitiesStored.length; idx++) {
                        totalRows += allQuantitiesStored[idx];
                    }

                    expect(totalRows).toEqual(3);
                });
        });
    });

    describe("select", function () {

        it("should return all rows when no filter function provided", function () {

            var customersToStore = [
                { CustomerID: 124, CustomerRef: "CUST004", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST005", CustomerName: "C Test" }
            ];

            return _indexedDbSvc.store("Customer", customersToStore)
                .then(function (qtyStore) {
                    return _indexedDbSvc.select("Customer");
                })
                .then(function (customers) {
                    expect(customers.length).toEqual(customersToStore.length);
                    expect(customers[0].CustomerID).toEqual(124);
                });
        });

        it("should return only matching rows when filter function provided", function () {

            var customersToStore = [
                { CustomerID: 124, CustomerRef: "CUST004", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST005", CustomerName: "C Test" }
            ];

            return _indexedDbSvc.store("Customer", customersToStore)
                .then(function (qtyStore) {

                    return _indexedDbSvc.select("Customer", { filterFn: function (c) { return c.CustomerID === 124; } });
                })
                .then(function (customers) {
                    expect(customers.length).toEqual(1);
                    expect(customers[0].CustomerID).toEqual(124);
                });
        });

        it("should return items in descending order when orderBy field set and sortAscending flag to false", function () {

            var customersToStore = [
                { CustomerID: 124, CustomerRef: "CUST004", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST005", CustomerName: "C Test" }
            ];

            return _indexedDbSvc.store("Customer", customersToStore)
                .then(function (qtyStore) {

                    return _indexedDbSvc.select("Customer", { orderBy: "CustomerID", sortAscending: false });
                })
                .then(function (customers) {
                    expect(customers.length).toEqual(2);
                    expect(customers[0].CustomerID).toEqual(125);
                });
        });
    });

    describe("selectLeftJoin", function () {

        it("Returns at least one instance of all left items and possibly more merged with each matching right items", function () {

            var customersToStore = [
                { CustomerID: 123, CustomerRef: "CUST123", CustomerName: "A Test" },
                { CustomerID: 124, CustomerRef: "CUST124", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST125", CustomerName: "C Test" }
            ];

            var policiesToStore = [
                { PolicyID: 234, PolicyRef: "POL004", CustomerID: 123 },
                { PolicyID: 235, PolicyRef: "POL005", CustomerID: 123 }
            ];

            recordsToStore = [["Customer", customersToStore], ["Policy", policiesToStore]];

            return _indexedDbSvc.storeMany(recordsToStore)
                .then(function () {

                    /** @type {selectLeftJoinOptions} */
                    var options = {
                        leftStoreName: "Customer",
                        leftFilterFn: function (c) { return [123, 125].indexOf(c.CustomerID) > -1; },
                        leftJoinField: "CustomerID",
                        rightStoreName: "Policy",
                        rightFilterFn: null,
                        rightJoinField: "CustomerID",
                        sortAscending: false,
                        transformFnOrSelectDbItemsOnly: null,
                        orderBy: null
                    };

                    return _indexedDbSvc.selectLeftJoin(options);
                })
                .then(function (results) {

                    expect(results.length).toEqual(3);

                    forEach(results, function (idx, item) {

                        if (item.CustomerID == 123) {
                            expect(item.CustomerID).toBeGreaterThanOrEqual(123);
                            expect(item.PolicyID).toBeGreaterThan(0);
                        }
                        else if (item.CustomerID == 125) {
                            expect(item.CustomerID).toBeGreaterThanOrEqual(125);
                            expect(item.PolicyID).toBeUndefined();
                        }
                    })
                });

        });
    });

    describe("selectInnerJoin", function () {

        it("Returns instances of all left items merged with each matching right items, only where there is a match", function () {

            var customersToStore = [
                { CustomerID: 123, CustomerRef: "CUST123", CustomerName: "A Test" },
                { CustomerID: 124, CustomerRef: "CUST124", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST125", CustomerName: "C Test" }
            ];

            var policiesToStore = [
                { PolicyID: 234, PolicyRef: "POL004", CustomerID: 123 },
                { PolicyID: 235, PolicyRef: "POL005", CustomerID: 123 },
                { PolicyID: 236, PolicyRef: "POL006", CustomerID: 124 }
            ];

            recordsToStore = [["Customer", customersToStore], ["Policy", policiesToStore]];

            return _indexedDbSvc.storeMany(recordsToStore)
                .then(function () {

                    /** @type {selectLeftJoinOptions} */
                    var options = {
                        leftStoreName: "Customer",
                        leftFilterFn: function (c) { return c.CustomerID == 123; },
                        leftJoinField: "CustomerID",
                        rightStoreName: "Policy",
                        rightFilterFn: null,
                        rightJoinField: "CustomerID",
                        sortAscending: false,
                        transformFnOrSelectDbItemsOnly: null,
                        orderBy: null
                    };

                    return _indexedDbSvc.selectLeftJoin(options);
                })
                .then(function (results) {

                    expect(results.length).toEqual(2);

                    forEach(results, function (idx, item) {

                        expect(item.CustomerID).toEqual(123);
                        expect(item.PolicyID).toBeGreaterThan(0);
                    })
                });
        });
    });

    describe("selectLeftJoinOnArray", function () {

        it("Returns at least one instance of any left (store) items and merged with any matching right (array) items only where there is a match", function () {

            var customersToStore = [
                { CustomerID: 123, CustomerRef: "CUST123", CustomerName: "A Test" },
                { CustomerID: 124, CustomerRef: "CUST124", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST125", CustomerName: "C Test" }
            ];

            return _indexedDbSvc.store("Customer", customersToStore)
                .then(function () {

                    /** @type {selectLeftJoinOnArrayOptions} */
                    var options = {
                        dbField: "CustomerID",
                        joinArray: [
                            { PolicyID: 1, CustomerID: 123, PolicyRef: "POL1" },
                            { PolicyID: 2, CustomerID: 123, PolicyRef: "POL2" },
                            { PolicyID: 3, CustomerID: 125, PolicyRef: "POL3" }],
                        arrayField: "CustomerID",
                        storeFilterFn: function (c) { return c.CustomerID == 123 || c.CustomerID == 124; },
                        orderBy: null,
                        sortAscending: false,
                        transformFnOrSelectDbItemsOnly: null
                    };

                    return _indexedDbSvc.selectLeftJoinOnArray("Customer", options);
                })
                .then(function (results) {

                    expect(results.length).toEqual(3);

                    forEach(results, function (idx, item) {

                        expect([123, 124]).toContain(item.CustomerID);

                        if (item.CustomerID == 123) {
                            expect(item.PolicyID).not.toBeNull();
                        }
                        else if (item.CustomerID == 124) {
                            expect(item.PolicyID).toBeUndefined();
                        }
                    });
                });
        });
    });

    describe("selectInnerJoinOnArray", function () {

        it("Returns left (store) items merged with each matching right (array) item only where there is a matching right (array) item", function () {

            var customersToStore = [
                { CustomerID: 123, CustomerRef: "CUST123", CustomerName: "A Test" },
                { CustomerID: 124, CustomerRef: "CUST124", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST125", CustomerName: "C Test" }
            ];

            return _indexedDbSvc.store("Customer", customersToStore)
                .then(function () {

                    /** @type {selectInnerJoinOnArrayOptions} */
                    var options = {
                        dbField: "CustomerID",
                        joinArray: [
                            { PolicyID: 1, CustomerID: 123, PolicyRef: "POL1" },
                            { PolicyID: 2, CustomerID: 123, PolicyRef: "POL2" },
                            { PolicyID: 3, CustomerID: 125, PolicyRef: "POL3" }],
                        arrayField: "CustomerID",
                        storeFilterFn: function (c) { return c.CustomerID == 123 || c.CustomerID == 124; },
                        orderBy: null,
                        sortAscending: false,
                        transformFnOrSelectDbItemsOnly: null
                    };

                    return _indexedDbSvc.selectInnerJoinOnArray("Customer", options);
                })
                .then(function (results) {

                    expect(results.length).toEqual(2);

                    forEach(results, function (idx, item) {

                        expect(item.CustomerID).toEqual(123);

                        expect(item.PolicyID).not.toBeNull();

                    });
                });
        });
    });
});
