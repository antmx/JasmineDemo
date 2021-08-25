/// <reference path="../src/services/indexeddbsvc.js" />

describe("IndexedDbSvc", function () {

    const dbName = "JasmineDemo";
    const _indexedDbSvc = new IndexedDbSvc(dbName);
    jasmine.getEnv().configure({ random: false });

    beforeAll(function (done) {

        _indexedDbSvc.DeleteDatabase()
            .then(function () {

                var storeSpecs = [
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

                return _indexedDbSvc.CreateDatabase(1, storeSpecs);
            })
            .then(function () {
                done();
            });
    });

    describe("DatabaseExists", function () {

        it("should return false when called with non-existant database name", function (done) {

            var randomDbName = "foo" + new Date().getTime();

            _indexedDbSvc.DatabaseExists(randomDbName)
                .then(function (exists) {
                    expect(exists).toBeFalse();
                    done();
                });

        });

        it("should return true when called with existing database name", function (done) {
            _indexedDbSvc.DatabaseExists(dbName)
                .then(function (exists) {
                    expect(exists).toBeTrue();
                    done();
                });
        });

    });

    describe("StoreExists", function () {

        it("should return false when called with non-existant store name", function (done) {

            var randomStoreName = "foo" + new Date().getTime();

            _indexedDbSvc.StoreExists(randomStoreName)
                .then(function (exists) {
                    expect(exists).toBeFalse();
                    done();
                });

        });

        it("should return true when called with existing store name", function (done) {

            var existingStoreName = "Customer";

            _indexedDbSvc.StoreExists(existingStoreName)
                .then(function (exists) {
                    expect(exists).toBeTrue();
                    done();
                });

        });
    });

    describe("Store", function () {

        it("should store a single item in the given store", function (done) {

            var customer = { CustomerID: 123, CustomerRef: "CUST003", CustomerName: "A Test" };

            _indexedDbSvc.Store("Customer", customer).
                then(function (qtyRowsStored) {
                    expect(qtyRowsStored).toEqual(1);
                    done();
                });
        });

        it("should store multiple items in the given store", function (done) {

            var customers = [
                { CustomerID: 124, CustomerRef: "CUST004", CustomerName: "B Test" },
                { CustomerID: 125, CustomerRef: "CUST005", CustomerName: "C Test" }
            ];

            _indexedDbSvc.Store("Customer", customers).
                then(function (qtyRowsStored) {
                    expect(qtyRowsStored).toEqual(2);
                    done();
                });
        });
    });

    describe("StoreMany", function () {

        it("should store in a single table", function (done) {

            var data = [["Customer", { CustomerID: 126, CustomerRef: "CUST006", CustomerName: "D Test" }]];

            _indexedDbSvc.StoreMany(data).
                then(function (allQuantitiesStored) {

                    var totalRows = 0;
                    for (var idx = 0; idx < allQuantitiesStored.length; idx++) {
                        totalRows += allQuantitiesStored[idx];
                    }

                    expect(totalRows).toEqual(1);

                    done();
                });
        });

        it("should store in multiple tables", function (done) {

            var data = [
                ["Customer",
                    { CustomerID: 127, CustomerRef: "CUST007", CustomerName: "E Test" }
                ],
                ["Policy", [
                    { PolicyID: 124, PolicyRef: "POL001", CustomerID: 127 },
                    { PolicyID: 125, PolicyRef: "POL002", CustomerID: 127 }
                ]]
            ];

            _indexedDbSvc.StoreMany(data).
                then(function (allQuantitiesStored) {

                    var totalRows = 0;
                    for (var idx = 0; idx < allQuantitiesStored.length; idx++) {
                        totalRows += allQuantitiesStored[idx];
                    }

                    expect(totalRows).toEqual(3);

                    done();
                });
        });
    });

    describe("Select", function () {

        it("should return all rows when no filter function provided", function (done) {

            _indexedDbSvc.Select("Customer")
                .then(function (customers) {

                    expect(customers.length).toBeGreaterThan(0);

                    done();
                });
        });

        it("should return only matching rows when filter function provided", function (done) {

            _indexedDbSvc.Select("Customer", function (c) { return c.CustomerID === 123; })
                .then(function (customers) {

                    expect(customers.length).toEqual(1);
                    expect(customers[0].CustomerID).toEqual(123);

                    done();
                })
        });

        it("should return items in descending order when orderBy field set and sortAscending flag to false", function (done) {

            _indexedDbSvc.Select(
                "Customer",
                null,
                null,
                "CustomerID",
                false)
                .then(function (customers) {

                    expect(customers.length).toEqual(5);
                    expect(customers[0].CustomerID).toEqual(127);

                    done();
                })
        });
    });

    describe("SelectLeftJoin", function () {

        it("Returns all left items for each matching right item", function (done) {

            _indexedDbSvc.SelectLeftJoin("Customer", function (c) { return c.CustomerID === 127; }, "CustomerID", "Policy", null, "CustomerID", false, null, null)
                .then(function (results) {
                    
                    expect(results.length).toEqual(2);

                    forEach(results, function (idx, item) {

                        expect(item.CustomerID).toEqual(127);
                        expect(item.PolicyID).toBeGreaterThan(0);
                    });

                    done();
                });
        });
    });
});
