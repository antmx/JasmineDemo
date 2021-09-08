/// <reference path="../services/indexeddbsvc.js" />

/** Vue for index page  */
var indexVue = new Vue({
    el: '#root',

    data: {
        name: 'Vue.js',
        idxDbSvc: new indexedDbSvc("DemoDb"),
        dbCreated: false,
        storeSchemas: [
            {
                storeName: "Customer",
                mainIndexName: "CustomerID",
                indexes: [
                    { name: "CustomerID", isUnique: true },
                    { name: "CustomerRef", isUnique: true },
                    { name: "CustomerName", isUnique: false }
                ],
                addModifiedDataCol: true
            },
            {
                storeName: "Policy",
                mainIndexName: "PolicyID",
                indexes: [
                    { name: "PolicyID", isUnique: true },
                    { name: "PolicyRef", isUnique: true },
                    { name: "CustomerID", isUnique: false }
                ],
                addModifiedDataCol: true
            },
        ],
        storeNames: [],
        activeStoreName: null,
        storeData: [],
        dummyData: [
            ["Customer", [
                { CustomerID: 1, CustomerRef: "CUST001", CustomerName: "A Test" },
                { CustomerID: 2, CustomerRef: "CUST002", CustomerName: "B Test" }
            ]
            ],
            ["Policy", [
                { PolicyID: 1, PolicyRef: "POL001", CustomerID: 1 },
                { PolicyID: 2, PolicyRef: "POL002", CustomerID: 1 },
                { PolicyID: 3, PolicyRef: "POL003", CustomerID: 2 }
            ]
            ]
        ],
        selectedCustomer: {},
        selectedPolicy: {}
    },

    computed: {
        isStoreSelected: function () {
            return this.activeStoreName != null;
        }
    },

    // define methods under the `methods` object
    methods: {
        greet: function (event) {
            // `this` inside methods points to the Vue instance
            alert('Hello ' + this.name + '!');

            // `event` is the native DOM event
            if (event) {
                alert(event.target.tagName);
            }
        },

        createDb: function () {
            var self = this;

            this.idxDbSvc.createDatabase(1, this.storeSchemas)
                .then(function (foo) {
                    self.dbCreated = true;
                    self.storeNames = [];
                });
        },

        deleteDb: function () {
            var self = this;

            this.idxDbSvc.deleteDatabase()
                .then(function (foo) {
                    self.dbCreated = false;
                    self.storeNames = [];
                    self.activeStoreName = null;
                    self.storeData = [];
                });
        },

        listStores: function () {
            var self = this;

            this.storeData = [];

            this.idxDbSvc.fetchAllStores()
                .then(function (storeNames) {
                    self.storeNames = storeNames;

                    if (storeNames && storeNames.length > 0) {
                        self.dbCreated = true;
                    }
                });
        },

        /**
         * 
         * @param {string} storeName
         */
        listStoreData: function (storeName) {

            var self = this;

            this.idxDbSvc.select(storeName || this.activeStoreName)
                .then(function (rows) {
                    self.storeData = rows;
                });
        },

        activateStoreListElem: function (storeName) {

            this.activeStoreName = storeName || this.activeStoreName;
        },

        populateStore: function () {

            var dataToStore;

            for (var idx = 0; idx < this.dummyData.length; idx++) {
                if (this.dummyData[idx][0] == this.activeStoreName) {
                    dataToStore = [this.dummyData[idx]];
                    break;
                }
            }

            if (dataToStore == null) {
                console.error("Unexpected store name: " + this.activeStoreName);
                return;
            }

            this.idxDbSvc.storeMany(dataToStore);
        },

        showStoreItemEditor: function (itemIdentifier) {

            var self = this;

            this.clearSelectedItems();

            switch (this.activeStoreName) {
                case "Customer":
                    if (itemIdentifier != null) {
                        this.idxDbSvc
                            .select("Customer", { filterFn: function (c) { return c.CustomerID == itemIdentifier; } })
                            .then(function (customers) {
                                self.selectedCustomer = customers[0];
                            });
                    }
                    else {
                        // New Customer
                        self.selectedCustomer = { CustomerID: 0 };
                    }
                    break;

                case "Policy":
                    if (itemIdentifier != null) {
                        this.idxDbSvc
                            .select("Policy", { filterFn: function (p) { return p.PolicyID == itemIdentifier; } })
                            .then(function (policies) {
                                console.log("Selecting Policy " + policies[0].PolicyID);
                                self.selectedPolicy = policies[0];
                            });
                    }
                    else {
                        self.selectedPolicy = { PolicyID: 0 };
                    }
                    break;

                default:
                    console.error("Unexpected activeStoreName: " + this.activeStoreName);
            }
        },

        clearSelectedItems: function () {

            this.selectedCustomer = {};
            this.selectedPolicy = {};
        }
    },

    mounted: function () {

        this.$nextTick(function () {
            // Will be executed when the DOM is ready
        })
    }
});
