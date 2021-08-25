/// <reference path="Storage.js" />
/// <reference path="Misc.js" />


/**
* @type {(string|function)}
*/
var mSyncRetryProc;

/**
 * DB transaction.
 * @type {IDBTransaction}
 */
var mSyncStoreTransaction;

/**
 * The Sync ID - value comes from server in the return from call to Web API InitSync.Get
 * @type {string}
 */
var mSyncID;

/**
 * Flag indicating if local DB needs resetting - value comes from server in the return from call to Web API InitSync.Get
 * @type {Boolean}
 */
var mSyncResetDB;

/**
 * User login credentials.
 * @type {{Username: string, Token: string}}
 */
var mSyncCredentials;

/**
 * Device ID.
 * @type {string}
 */
var mSyncDeviceID;

var mSyncSendingData;
var mSyncStoringLocalData;
var mSyncQueryingLocalData;
var mSyncRequestingData;

/**
 * Function to be called when completed (when either succeeded or failed).
 * @type {{(syncResult: boolean, syncFailReason:string) => void}}
 */
var mSyncOnCompletedFn;

var mSyncError;

/**
 * Flag to indicate if client wants to receive only data that has changed since last sync, or all changed and unchanged data.
 * @type {Boolean}
 */
var mSyncChangesOnly;

/**
 * @type {DbQuerySvc}
 */
var mSyncDbQuerySvc;

/**
 * Sync_Start : Call this to start the sync process.
 * @param {{(syncResult: boolean, syncFailReason:string) => void}} onCompletedFn Function to be called when completed (when either succeeded or failed).
 * @param {boolean} changesOnly Flag for whether to return only items from server that have changed since the last sync.
 * @param {{username:string, authToken:string}} credentials Authentication credentials.
 * @param {string} deviceId Local machine's ID (guid).
 * @returns {void}
 */
function Sync_Start(onCompletedFn, changesOnly, credentials, deviceId) {

    mSyncOnCompletedFn = onCompletedFn;
    mSyncChangesOnly = changesOnly;
    mSyncCredentials = credentials;
    mSyncDeviceID = deviceId;
    mSyncError = null;
    mSyncDbQuerySvc = new IndexedDbSvc();

    if (!IsOnline()) {
        mSyncOnCompletedFn.call(null, false, "offline");
        return;
    }

    Sync_GetVersion();

    Sync_CheckConnectionSpeed(Sync_CheckConnectionSpeed_CallBack);
}

/**
 * Outputs a message during Syncing.
 * @param {string} text Message text.
 * @returns {void}
 */
function Sync_Message(text) {

    if (text) {
        console.log(text);
    }
}

/**
 * Retrieves version info and stores in localStorage.
 * @returns {void}
 */
function Sync_GetVersion() {

    try {
        $.get("manifest.appcache")
            .done(function (fileContents) {
                var lines = fileContents.split("\r\n");
                window.localStorage.setItem("VersionDate", lines[1].replace("# ", ""));
                window.localStorage.setItem("VersionNo", lines[2].replace("# ", ""));
            });
    }
    catch (e) {
        console.error("Error getting version info: " + e);
    }
}

/**
 * Checks the connection speed.
 * @param {{(isFastEnough: boolean) => void}} callBack Function to pass speed-check result to.
 * @returns {void}
 */
function Sync_CheckConnectionSpeed(callBack) {

    var startTime;
    var msg = "Speed: glacial";

    try {

        Sync_Message("Checking Connection Speed...");

        startTime = SystemDate.Now().getTime();
        var rnd = Math.floor(Math.random() * 100000);

        $.ajax({
            url: CheckServerConnectionURL,
            data: { Random_Number: rnd },
            type: "GET",
            timeout: 10000
        })
            .done(function (fileContents) {
                var endTime = (SystemDate.Now()).getTime();
                var duration = (endTime - startTime) / 1000;

                if (duration < 5) {
                    msg = "Speed: poor";
                }

                if (duration < 2) {
                    msg = "Speed: good";
                }

                if (duration < 1) {
                    msg = "Speed: fast";
                }

                Sync_Message(msg);

                BusyMessage.show("Sync in progress. " + msg, { dialogSize: "m", progressType: "progress" });

                setTimeout(function () { callBack.call(null, true); }, 1000);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                Sync_Message(msg);
                BusyMessage.show("Sync in progress. " + msg, { dialogSize: "m", progressType: "progress" });
                setTimeout(function () { callBack.call(null, false); }, 1000);
            });
    }
    catch (e) {
        Sync_Message(msg);
        BusyMessage.show("Sync in progress. " + msg, { dialogSize: "m", progressType: "progress" });
        setTimeout(function () { callBack.call(null, false); }, 1000);
    }
}

function Sync_CheckConnectionSpeed_CallBack(isFastEnough) {

    if (isFastEnough) {
        Sync_Entry(/*true, true*/);
    }
    else {
        Sync_EnableScreen();
        mSyncOnCompletedFn.call(null, false, "Error checking connection speed");
    }
}

function Sync_Entry(/*downloadOnly, preserveIsModifiedData*/) {

    try {
        $.ajaxSetup({ timeout: 6 * 60 * 1000 }); // milliseconds
        Sync_Initalise();
    }
    catch (e) {
        alert(e);
    }
}

function Sync_Initalise() {

    //Sync_DB_Open(DBName);

    // Begin the sync with the server
    Sync_InitSyncWithServer()
        .done(function () {

            // Begin uploading
            Sync_UploadCustomers();
        })
        .fail(function (error) {

            mSyncError = "Error starting sync: " + error;
        });
}

function Sync_DownloadStart() {

    // Need to download whilst IndexedDB has an open tx
    Sync_DB_Open(DBName);
}

function Sync_DB_Open(dbName) {

    try {
        var request = window.indexedDB.open(dbName);

        request.onsuccess = function (evt) {
            // alert("success");
            Sync_OpenDB_CallBack(evt.target.result);
        };

        request.onblocked = function (evt) {
            alert("blocked");
            Sync_OpenDB_CallBack(null);
        };

        request.onerror = function (evt) {
            alert("error");
            Sync_OpenDB_CallBack(null);
        };

        //request.onupgradeneeded = function (event) {
        //    var db = event.target.result;
        //    alert("Sync triggered onupgradeneeded - needs handling");
        //};
    }
    catch (e) {
        alert("Sync_DB_Open " + e);
    }
}

/**
 * Callback function for Sync_DB_Open.
 * @param {IDBDatabase} db
 */
function Sync_OpenDB_CallBack(db) {

    try {
        if (db !== null) {
            Sync_DB_Transaction_Open(db);
        }
    }
    catch (e) {
        alert("Sync_OpenDB_CallBack error " + e);
        console.log(e.message);
    }
}

/**
 * Opens the database transaction.
 * @param {IDBDatabase} db
 */
function Sync_DB_Transaction_Open(db) {

    mSyncStoreTransaction = db.transaction(db.objectStoreNames, "readwrite");

    //// Begin the sync with the server
    //Sync_InitSyncWithServer()
    //    .done(function () {

    //        // Begin uploading
    //        Sync_UploadCustomers();
    //    })
    //    .fail(function (error) {

    //        mSyncError = "Error starting sync: " + error;
    //    });

    mSyncStoreTransaction.oncomplete = function (e) {

        console.log("transaction oncomplete");
        Sync_Message("Completed");
        Sync_EnableScreen();

        if (StringIsNullOrEmpty(mSyncError)) {
            RecentlyAddedCustomers("clear");
            CheckHaveUnSentData(false);
            mSyncOnCompletedFn.call(null, true);
        }
        else {
            mSyncOnCompletedFn.call(null, false, mSyncError);
        }
    };

    mSyncStoreTransaction.onerror = function (e) {

        var storeName = "", keyPath = "", error = "", errorMsg = "", errorName = "";

        try { storeName = e.target.source.name; } catch (e) { }
        try { keyPath = e.target.source.keyPath; } catch (e) { }
        try { error = e.target.error; } catch (e) { }
        try { errorMsg = e.target.error.message; } catch (e) { }
        try { errorName = e.target.error.name; } catch (e) { }

        console.error("transaction error at " + storeName + "." + keyPath + ": " + errorName + " " + errorMsg + " " + error);

        Sync_EnableScreen();

        mSyncOnCompletedFn.call(null, false, "tx error " + (errorMsg || errorName || e));
    };

    mSyncStoreTransaction.onabort = function (e) {

        var storeName = "", keyPath = "", error = "", errorMsg = "", errorName = "";

        try { storeName = e.target.source.name; } catch (e) { }
        try { keyPath = e.target.source.keyPath; } catch (e) { }
        try { error = e.target.error; } catch (e) { }
        try { errorMsg = e.target.error.message; } catch (e) { }
        try { errorName = e.target.error.name; } catch (e) { }

        console.error("transaction abort at " + storeName + "." + keyPath + ": " + errorName + " " + errorMsg + " " + error);

        Sync_EnableScreen();

        mSyncOnCompletedFn.call(null, false, "tx aborted " + (errorMsg || errorName || e));
    };

    // Start downloading data from server
    Sync_DownloadNews();

}

function Sync_InitSyncWithServer() {

    // Param for Web Svc InitSyncController.Get
    var initSyncData = {
        DeviceDateTime: DateToNeutralString(SystemDate.Now()),
        ChangesOnly: mSyncChangesOnly,
        DeviceID: mSyncDeviceID,
        ApplicationVersion: localStorage.VersionNo
    };

    var deferred = $.Deferred();

    $.ajax({
        url: InitSyncURL,
        data: initSyncData,
        type: "GET",
        //async: false,
        beforeSend: function (xhr) {
            // Apply authorization header to the request, which will be picked up on server by AuthenticationFilter/AuthorisationFilter
            ApplyTokenAuthorizationHeader(xhr, mSyncCredentials);
        }
    })
        .done(function (syncInfo) {
            if (syncInfo && syncInfo.length > 0) {
                syncInfo = syncInfo[0];

                if (StringEquals(syncInfo.CanSync, "true")) {

                    mSyncID = syncInfo.SyncID;
                    mSyncResetDB = syncInfo.ResetDB;

                    deferred.resolve();

                    return;
                }
            }

            console.error("Sync_InitSyncWithServer - returned SyncInfo is invalid");

            deferred.reject("Server returned invalid SyncInfo");
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error("Sync_InitSyncWithServer failed - " + errorThrown);

            deferred.reject(errorThrown);
        });

    return deferred.promise();
}

//######
//#### Upload all modified data before we download updates
//######
function Sync_UploadCustomers() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblCustomer, function filter(c) { return c.ModifiedData == "1"; })
        .done(function (customers) {
            if (DoesArrayFirstItemExist(customers)) {
                Sync_Message("Sending Customers...");
                Sync_UploadArray(CustomersURL, customers);
                Sync_UploadCapexHeaders();
            }
            else {
                // Move straight to next data set
                Sync_UploadCapexHeaders();
            }
        });
}

function Sync_UploadCapexHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblCapexHeader, function filter(hdr) { return hdr.ModifiedData == "1"; })
        .done(function (headers) {
            if (DoesArrayFirstItemExist(headers)) {
                Sync_Message("Sending Capex Headers...");
                Sync_UploadArray(CapexHeaderURL, headers);
                Sync_UploadCapexLines();
            }
            else {
                Sync_UploadCapexLines();
            }
        });
}

function Sync_UploadCapexLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblCapexLine, function filter(ln) { return ln.ModifiedData == "1"; })
        .done(function (lines) {
            if (DoesArrayFirstItemExist(lines)) {
                Sync_Message("Sending Capex Lines...");
                Sync_UploadArray(CapexLinesURL, lines);
                Sync_UploadCashflowHeaders();
            }
            else {
                Sync_UploadCashflowHeaders();
            }
        });
}

function Sync_UploadCashflowHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblCashflowHeader, function filter(hdr) { return hdr.ModifiedData == "1"; })
        .done(function (headers) {
            if (DoesArrayFirstItemExist(headers)) {
                Sync_Message("Sending Cashflow Headers...");
                Sync_UploadArray(CashflowHeaderURL, headers);
                Sync_UploadCashflowLines();
            }
            else {
                Sync_UploadCashflowLines();
            }
        });
}

function Sync_UploadCashflowLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblCashflowLine, function filter(ln) { return ln.ModifiedData == "1"; })
        .done(function (lines) {
            if (DoesArrayFirstItemExist(lines)) {
                Sync_Message("Sending Cashflow Lines...");
                Sync_UploadArray(CashflowLinesURL, lines);
                Sync_UploadDairyYoungstockCalenders();
            }
            else {
                Sync_UploadDairyYoungstockCalenders();
            }
        });
}

function Sync_UploadDairyYoungstockCalenders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblDairyYoungstockCalHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending Youngstock Calenders Headers...");
                Sync_UploadArray(DYURL, hdr);
                Sync_UploadDairyYoungstockCalendarLines();
            }
            else {
                Sync_UploadDairyYoungstockCalendarLines();
            }
        });
}

function Sync_UploadDairyYoungstockCalendarLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblDairyYoungstockCalLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Youngstock Calenders Lines...");
                Sync_UploadArray(DYLinesURL, lne);
                Sync_UploadBeefRearingCalenders();
            }
            else {
                Sync_UploadBeefRearingCalenders();
            }
        });
}

function Sync_UploadBeefRearingCalenders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblBeefRearingCalHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending beef rearing Calenders Headers...");
                Sync_UploadArray(BRURL, hdr);
                Sync_UploadBeefRearingCalendarLines();
            }
            else {
                Sync_UploadBeefRearingCalendarLines();
            }
        });
}

function Sync_UploadBeefRearingCalendarLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblBeefRearingCalLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Beef Rearing Calenders Lines...");
                Sync_UploadArray(BRLinesURL, lne);
                Sync_UploadOtherRearingCalenders();
            }
            else {
                Sync_UploadOtherRearingCalenders();
            }
        });
}

function Sync_UploadOtherRearingCalenders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblOtherRearingCalHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending Other Rearing Calenders Headers...");
                Sync_UploadArray(ORURL, hdr);
                Sync_UploadOtherRearingCalendarLines();
            }
            else {
                Sync_UploadOtherRearingCalendarLines();
            }
        });
}

function Sync_UploadOtherRearingCalendarLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblOtherRearingCalLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending other rearing Calenders Lines...");
                Sync_UploadArray(ORLinesURL, lne);
                Sync_UploadBreedingEwesCalenders();
            }
            else {
                Sync_UploadBreedingEwesCalenders();
            }
        });
}

function Sync_UploadBreedingEwesCalenders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblBreedingEweCalHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending breeding ewes Calenders Headers...");
                Sync_UploadArray(BEURL, hdr);
                Sync_UploadBreedingEwesLines();
            }
            else {
                Sync_UploadBreedingEwesLines();
            }
        });
}

function Sync_UploadBreedingEwesLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblBreedingEweCalLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending breeding ewes Calenders Lines...");
                Sync_UploadArray(BELinesURL, lne);
                Sync_UploadSucklerCowsCalenders();
            }
            else {
                Sync_UploadSucklerCowsCalenders();
            }
        });
}

function Sync_UploadSucklerCowsCalenders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblSucklerCowCalHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending suckler cows Calenders Headers...");
                Sync_UploadArray(SCURL, hdr);
                Sync_UploadSucklerCowsLines();
            }
            else {
                Sync_UploadSucklerCowsLines();
            }
        });
}

function Sync_UploadSucklerCowsLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblSucklerCowCalLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending suckler cows Calenders Lines...");
                Sync_UploadArray(SCLinesURL, lne);
                Sync_UploadOtherLivestockCalenders();
            }
            else {
                Sync_UploadOtherLivestockCalenders();
            }
        });
}

function Sync_UploadOtherLivestockCalenders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblOtherLivestockCalHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending other livestock Calenders Headers...");
                Sync_UploadArray(OLURL, hdr);
                Sync_UploadOthreLivestockLines();
            }
            else {
                Sync_UploadOthreLivestockLines();
            }
        });
}

function Sync_UploadOthreLivestockLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblOtherLivestockCalLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending other livestock Calenders Lines...");
                Sync_UploadArray(OLLinesURL, lne);
                Sync_UploadArableCropReconcilHeaders();
            }
            else {
                Sync_UploadArableCropReconcilHeaders();
            }
        });
}

function Sync_UploadArableCropReconcilHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblArableCropReconcilHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending arable crop Headers...");
                Sync_UploadArray(ArableCropReconcilHeaderURL, hdr);
                Sync_UploadArableCropReconcilLines();
            }
            else {
                Sync_UploadArableCropReconcilLines();
            }
        });
}

function Sync_UploadArableCropReconcilLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblArableCropReconcilLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending arable crop lines...");
                Sync_UploadArray(ArableCropReconcilLineURL, lne);
                Sync_UploadOtherCropHeaders();
            }
            else {
                Sync_UploadOtherCropHeaders();
            }
        });
}

function Sync_UploadOtherCropHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblOtherCropReconHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending other crop Headers...");
                Sync_UploadArray(OthCropHeaderURL, hdr);
                Sync_UploadOtherCropLines();
            }
            else {
                Sync_UploadOtherCropLines();
            }
        });
}

function Sync_UploadOtherCropLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblOtherCropReconLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending other crop lines...");
                Sync_UploadArray(OthCropLineURL, lne);
                Sync_UploadSubsidiesHeaders();
            }
            else {
                Sync_UploadSubsidiesHeaders();
            }
        });
}

function Sync_UploadSubsidiesHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblSubsidiesHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending subsidies Headers...");
                Sync_UploadArray(SubsidiesHeaderURL, hdr);
                Sync_UploadSubsidiesLines();
            }
            else {
                Sync_UploadSubsidiesLines();
            }
        });
}

function Sync_UploadSubsidiesLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblSubsidiesLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending subsides lines...");
                Sync_UploadArray(SubsidiesLinesURL, lne);
                Sync_UploadLoanSchedulesHeaders();
            }
            else {
                Sync_UploadLoanSchedulesHeaders();
            }
        });
}

function Sync_UploadLoanSchedulesHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblLoanScheduleHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending loan schedule Headers...");
                Sync_UploadArray(LoanScheduleHeaders, hdr);
                Sync_UploadLoanSchedulesLines();
            }
            else {
                Sync_UploadLoanSchedulesLines();
            }
        });
}

function Sync_UploadLoanSchedulesLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblLoanSchedulesLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending loan schedule lines...");
                Sync_UploadArray(LoanScheduleLines, lne);
                Sync_UploadRentSchedulesHeaders();
            }
            else {
                Sync_UploadRentSchedulesHeaders();
            }
        });
}

function Sync_UploadRentSchedulesHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblRentScheduleHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending Rent schedule Headers...");
                Sync_UploadArray(RentScheduleHeadersURL, hdr);
                Sync_UploadRentSchedulesLines();
            }
            else {
                Sync_UploadRentSchedulesLines();
            }
        });
}

function Sync_UploadRentSchedulesLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblRentScheduleLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Rent schedule lines...");
                Sync_UploadArray(RentScheduleLinesURL, lne);
                Sync_UploadGrossMaragin();
            }
            else {
                Sync_UploadGrossMaragin();
            }
        });
}

function Sync_UploadGrossMaragin() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblGrossMargin, function filter(gm) { return gm.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Gross Margins...");
                Sync_UploadArray(GMURL, lne, 200); // Upload 200 at a time, as there can be a large number of GMs
                Sync_UploadStockTransfers();
            }
            else {
                Sync_UploadStockTransfers();
            }
        });
}

function Sync_UploadStockTransfers() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTransfer, function filter(tr) { return tr.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending stock transfers...");
                Sync_UploadArray(StockTransfersURL, lne);
                Sync_UploadBalanceSheet();
            }
            else {
                Sync_UploadBalanceSheet();
            }
        });
}

function Sync_UploadBalanceSheet() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblBalanceSheet, function filter(bs) { return bs.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending BalanceSheet...");
                Sync_UploadArray(BalanceSheetURL, lne);
                Sync_UploadTradingSummarySheet();
            }
            else {
                Sync_UploadTradingSummarySheet();
            }
        });
}

function Sync_UploadTradingSummarySheet() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTradingSummary, function filter(ts) { return ts.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending trading summary...");
                Sync_UploadArray(TradingSummaryURL, lne);
                Sync_UploadDOFMaragin();
            }
            else {
                Sync_UploadDOFMaragin();
            }
        });
}

function Sync_UploadDOFMaragin() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblDOF, function filter(dof) { return dof.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Disposal of funds...");
                Sync_UploadArray(DOFURL, lne);
                Sync_UploadBudgetDate();
            }
            else {
                Sync_UploadBudgetDate();
            }
        });
}

function Sync_UploadBudgetDate() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblBudgetDate, function filter(bd) { return bd.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Budget dates...");
                Sync_UploadArray(BudgetDatesURL, lne);
                Sync_UploadOverheadCosts();
            }
            else {
                Sync_UploadOverheadCosts();
            }
        });
}

function Sync_UploadOverheadCosts() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblOverheadCost, function filter(oc) { return oc.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending overhead costs...");
                Sync_UploadArray(OverheadCostsURL, lne);
                Sync_UploadEnterpriseToCustomer();
            }
            else {
                Sync_UploadEnterpriseToCustomer();
            }
        });
}

function Sync_UploadEnterpriseToCustomer() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblEnterpriseToCustomer, function filter(ec) { return ec.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending enterprise to customers...");
                Sync_UploadArray(EnterpriseCustomerURL, lne);
                Sync_UploadConsultantToCustomer();
            }
            else {
                Sync_UploadConsultantToCustomer();
            }
        });
}

function Sync_UploadConsultantToCustomer() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblConsultantToCustomer, function filter(ec) { return ec.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending consultant to customers...");
                Sync_UploadArray(ConsultantCustomerURL, lne);
                Sync_UploadCropSchedules();
            }
            else {
                Sync_UploadCropSchedules();
            }
        });
}

function Sync_UploadCropSchedules() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblCropSchedule, function filter(cs) { return cs.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Crop Schedules...");
                Sync_UploadArray(CropScheduleURL, lne);
                Sync_UploadDairyHerdCalendarHeaders();
            }
            else {
                Sync_UploadDairyHerdCalendarHeaders();
            }
        });
}

function Sync_UploadDairyHerdCalendarHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblDairyHerdCalHeader, function filter(h) { return h.ModifiedData == "1"; })
        .done(function (hdr) {
            if (DoesArrayFirstItemExist(hdr)) {
                Sync_Message("Sending Dairy Herd Calendar Headers...");
                Sync_UploadArray(DHHeaderURL, hdr);
                Sync_UploadDairyHerdCalendarLines();
            }
            else {
                Sync_UploadDairyHerdCalendarLines();
            }
        });
}

function Sync_UploadDairyHerdCalendarLines() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblDairyHerdCalLine, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Dairy Herd Calendar Lines...");
                Sync_UploadArray(DHLinesURL, lne);
                Sync_UploadVatRateData();
            }
            else {
                Sync_UploadVatRateData();
            }
        });
}

function Sync_UploadVatRateData() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblVatRates, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending Vat Rate data...");
                Sync_UploadArray(VatRatesURL, lne);
                Sync_UploadWFNPImportData();
            }
            else {
                Sync_UploadWFNPImportData();
            }
        });
}

function Sync_UploadWFNPImportData() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblWfnpImport, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (lne) {
            if (DoesArrayFirstItemExist(lne)) {
                Sync_Message("Sending WFNP Import data...");
                Sync_UploadArray(WfnpImportURL, lne);
                Sync_UploadIncomeScheduleHeaders();
            }
            else {
                Sync_UploadIncomeScheduleHeaders();
            }
        });
}

function Sync_UploadIncomeScheduleHeaders() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblIncomeScheduleHeader, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (headers) {
            if (DoesArrayFirstItemExist(headers)) {
                Sync_Message("Sending Income Schedule Headers...");
                Sync_UploadArray(IncomeScheduleHeadersURL, headers);
                Sync_UploadIncomeScheduleItems();
            }
            else {
                Sync_UploadIncomeScheduleItems();
            }
        });
}

function Sync_UploadIncomeScheduleItems() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblIncomeScheduleItem, function filter(l) { return l.ModifiedData == "1"; })
        .done(function (items) {
            if (DoesArrayFirstItemExist(items)) {
                Sync_Message("Sending Income Schedule Items...");
                Sync_UploadArray(IncomeScheduleItemsURL, items);
                Sync_UploadTsdgVisits();
            }
            else {
                Sync_UploadTsdgVisits();
            }
        });
}

function Sync_UploadTsdgVisits() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisit, function filter(tv) { return tv.ModifiedData == "1"; })
        .done(function (visits) {
            if (DoesArrayFirstItemExist(visits)) {
                Sync_Message("Sending TSDG Visits...");
                Sync_UploadArray(TsdgVisitURL, visits);
                Sync_UploadTsdgVisitBalShtSmrys();
            }
            else {
                Sync_UploadTsdgVisitBalShtSmrys();
            }
        });
}

function Sync_UploadTsdgVisitBalShtSmrys() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitBalShtSmry, function filter(bss) { return bss.ModifiedData == "1"; })
        .done(function (balShtSmrys) {
            if (DoesArrayFirstItemExist(balShtSmrys)) {
                Sync_Message("Sending TSDG Visit Balance Sheet Summaries...");
                Sync_UploadArray(TsdgVisitBalShtSmryURL, balShtSmrys);
                Sync_UploadTsdgVisitBusRiskAreas();
            }
            else {
                Sync_UploadTsdgVisitBusRiskAreas();
            }
        });
}

function Sync_UploadTsdgVisitBusRiskAreas() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitBusRiskArea, function filter(bra) { return bra.ModifiedData == "1"; })
        .done(function (busRiskAreas) {
            if (DoesArrayFirstItemExist(busRiskAreas)) {
                Sync_Message("Sending TSDG Visit Business Risk Areas...");
                Sync_UploadArray(TsdgVisitBusRiskAreaURL, busRiskAreas);
                Sync_UploadTsdgVisitBusTrdngSmrys();
            }
            else {
                Sync_UploadTsdgVisitBusTrdngSmrys();
            }
        });
}

function Sync_UploadTsdgVisitBusTrdngSmrys() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitBusTrdngSmry, function filter(bts) { return bts.ModifiedData == "1"; })
        .done(function (busTrdngSmrys) {
            if (DoesArrayFirstItemExist(busTrdngSmrys)) {
                Sync_Message("Sending TSDG Visit Business Trading Summaries...");
                Sync_UploadArray(TsdgVisitBusTrdngSmryURL, busTrdngSmrys);
                Sync_UploadTsdgVisitKtpis();
            }
            else {
                Sync_UploadTsdgVisitKtpis();
            }
        });
}

function Sync_UploadTsdgVisitKtpis() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitKtpi, function filter(ktpi) { return ktpi.ModifiedData == "1"; })
        .done(function (ktpis) {
            if (DoesArrayFirstItemExist(ktpis)) {
                Sync_Message("Sending TSDG Visit KTPIs...");
                Sync_UploadArray(TsdgVisitKtpiURL, ktpis);
                Sync_UploadTsdgVisitOppActions();
            }
            else {
                Sync_UploadTsdgVisitOppActions();
            }
        });
}

function Sync_UploadTsdgVisitOppActions() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitOppAction, function filter(oa) { return oa.ModifiedData == "1"; })
        .done(function (oas) {
            if (DoesArrayFirstItemExist(oas)) {
                Sync_Message("Sending TSDG Visit Opportunities and Actions...");
                Sync_UploadArray(TsdgVisitOppActionURL, oas);
                Sync_UploadTsdgVisitProfitReqrmnts();
            }
            else {
                Sync_UploadTsdgVisitProfitReqrmnts();
            }
        });
}

function Sync_UploadTsdgVisitProfitReqrmnts() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitProfitReqrmnt, function filter(pr) { return pr.ModifiedData == "1"; })
        .done(function (prs) {
            if (DoesArrayFirstItemExist(prs)) {
                Sync_Message("Sending TSDG Visit Profit Requirements...");
                Sync_UploadArray(TsdgVisitProfitReqrmntURL, prs);
                Sync_UploadTsdgVisitProprtnlAnals();
            }
            else {
                Sync_UploadTsdgVisitProprtnlAnals();
            }
        });
}

function Sync_UploadTsdgVisitProprtnlAnals() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitProprtnlAnal, function filter(pa) { return pa.ModifiedData == "1"; })
        .done(function (pas) {
            if (DoesArrayFirstItemExist(pas)) {
                Sync_Message("Sending TSDG Visit Proportional Analysis...");
                Sync_UploadArray(TsdgVisitProprtnlAnalURL, pas);
                Sync_UploadTsdgVisitAnlMlkSales();
            }
            else {
                Sync_UploadTsdgVisitAnlMlkSales();
            }
        });
}

function Sync_UploadTsdgVisitAnlMlkSales() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitAnlMlkSale, function filter(ams) { return ams.ModifiedData == "1"; })
        .done(function (amss) {
            if (DoesArrayFirstItemExist(amss)) {
                Sync_Message("Sending TSDG Visit Annual Milk Sales...");
                Sync_UploadArray(TsdgVisitAnlMlkSaleURL, amss);
                Sync_UploadTsdgVisitEntprss();
            }
            else {
                Sync_UploadTsdgVisitEntprss();
            }
        });
}

function Sync_UploadTsdgVisitEntprss() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitEntprs, function filter(e) { return e.ModifiedData == "1"; })
        .done(function (es) {
            if (DoesArrayFirstItemExist(es)) {
                Sync_Message("Sending TSDG Visit Enterprises...");
                Sync_UploadArray(TsdgVisitEntprsURL, es);
                Sync_UploadTsdgVisitBusStrengths();
            }
            else {
                Sync_UploadTsdgVisitBusStrengths();
            }
        });
}

function Sync_UploadTsdgVisitBusStrengths() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitBusStrength, function filter(e) { return e.ModifiedData == "1"; })
        .done(function (bss) {
            if (DoesArrayFirstItemExist(bss)) {
                Sync_Message("Sending TSDG Visit Business Strengths...");
                Sync_UploadArray(TsdgVisitBusStrengthSyncURL, bss);
                Sync_UploadTsdgVisitKtpiCtgryLkps();
            }
            else {
                Sync_UploadTsdgVisitKtpiCtgryLkps();
            }
        });
}

function Sync_UploadTsdgVisitKtpiCtgryLkps() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitKtpiCtgryLkp, function filter(lkp) { return lkp.ModifiedData == "1"; })
        .done(function (lkps) {
            if (DoesArrayFirstItemExist(lkps)) {
                Sync_Message("Sending TSDG Visit KTPI Category Look-ups");
                Sync_UploadArray(TsdgVisitKtpiCtgryLkpSyncURL, lkps);
                Sync_UploadTsdgVisitEntprsNameLkps();
            }
            else {
                Sync_UploadTsdgVisitEntprsNameLkps();
            }
        });
}

function Sync_UploadTsdgVisitEntprsNameLkps() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitEntprsNameLkp, function filter(lkp) { return lkp.ModifiedData == "1"; })
        .done(function (lkps) {
            if (DoesArrayFirstItemExist(lkps)) {
                Sync_Message("Sending TSDG Visit Enterprise Name Look-ups");
                Sync_UploadArray(TsdgVisitEntprsNameLkpSyncURL, lkps);
                Sync_UploadTsdgVisitBusStrengthNameLkps();
            }
            else {
                Sync_UploadTsdgVisitBusStrengthNameLkps();
            }
        });
}

function Sync_UploadTsdgVisitBusStrengthNameLkps() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitBusStrengthNameLkp, function filter(lkp) { return lkp.ModifiedData == "1"; })
        .done(function (lkps) {
            if (DoesArrayFirstItemExist(lkps)) {
                Sync_Message("Sending TSDG Visit Business Strength Name Look-ups");
                Sync_UploadArray(TsdgVisitBusStrengthNameLkpSyncURL, lkps);
                Sync_UploadTsdgVisitBusRiskAreaDescLkps();
            }
            else {
                Sync_UploadTsdgVisitBusRiskAreaDescLkps();
            }
        });
}

function Sync_UploadTsdgVisitBusRiskAreaDescLkps() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitBusRiskAreaDescLkp, function filter(lkp) { return lkp.ModifiedData == "1"; })
        .done(function (lkps) {
            if (DoesArrayFirstItemExist(lkps)) {
                Sync_Message("Sending TSDG Visit Business Risk Area Description Look-ups");
                Sync_UploadArray(TsdgVisitBusRiskAreaDescLkpSyncURL, lkps);
                Sync_UploadTsdgVisitAtchmnts();
            }
            else {
                Sync_UploadTsdgVisitAtchmnts();
            }
        });
}

function Sync_UploadTsdgVisitAtchmnts() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitAtchmnt, function filter(at) { return at.ModifiedData == "1"; })
        .done(function (ats) {
            if (DoesArrayFirstItemExist(ats)) {
                Sync_Message("Sending TSDG Visit Attachments");
                Sync_UploadArray(TsdgVisitAtchmntSyncURL, ats);
                Sync_UploadTsdgVisitMgmtInfoSrcs();
            }
            else {
                Sync_UploadTsdgVisitMgmtInfoSrcs();
            }
        });
}

function Sync_UploadTsdgVisitMgmtInfoSrcs() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitMgmtInfoSrc, function filter(mis) { return mis.ModifiedData == "1"; })
        .done(function (miss) {
            if (DoesArrayFirstItemExist(miss)) {
                Sync_Message("Sending TSDG Visit Management Information Sources");
                Sync_UploadArray(TsdgVisitMgmtInfoSrcSyncURL, miss);
                Sync_UploadTsdgVisitMgmtInfoSrcNameLkps();
            }
            else {
                Sync_UploadTsdgVisitMgmtInfoSrcNameLkps();
            }
        });
}

function Sync_UploadTsdgVisitMgmtInfoSrcNameLkps() {

    mSyncDbQuerySvc.QueryDeferred(DBName, tblTsdgVisitMgmtInfoSrcNameLkp, function filter(lkp) { return lkp.ModifiedData == "1"; })
        .done(function (lkps) {
            if (DoesArrayFirstItemExist(lkps)) {
                Sync_Message("Sending TSDG Visit Management Information Source Name Look-ups");
                Sync_UploadArray(TsdgVisitMgmtInfoSrcNameLkpSyncURL, lkps);
                Sync_Upload_Complete();
            }
            else {
                Sync_Upload_Complete();
            }
        });
}

function Sync_Upload_Complete() {

    if (!StringIsNullOrEmpty(mSyncError)) {
        // Error occurred during an upload, so do not start download as we don't want to overwrite local data until we've fixed the upload failure
        return;
    }

    var syncCompletedData = { SyncId: mSyncID };

    $.ajax({
        url: SyncCompletedURL,
        data: syncCompletedData,
        type: "GET",
        async: false,
        beforeSend: function (xhr) {
            // Apply authorization header to the request, which will be picked up on server by AuthenticationFilter/AuthorisationFilter
            ApplyTokenAuthorizationHeader(xhr, mSyncCredentials);
        }
    })
        .done(function (data) {
            // Start the download chain
            //Sync_DownloadNews();
            Sync_DownloadStart();
        })
        .fail(function (jqXhr, textStatus, errorThrown) {
            var errorMsg = textStatus;
            if (jqXhr && jqXhr.responseJSON && jqXhr.responseJSON.ExceptionMessage) {
                errorMsg = jqXhr.responseJSON.ExceptionMessage;
            }
            //alert("Error in SyncComplete " + errorMsg);
            mSyncError = "Error in SyncComplete " + errorMsg;

            Sync_HandleError(errorMsg);
        });
}

/**
 * Uploads each item in the array to the specified database table sync url.
 * @param {string} url URL of the web service method for syncing the table.
 * @param {[]} array Array of items to upload into the database table.
 * @param {number} [uploadQty] Optional number of items to upload at a time. Default is 1.
 */
function Sync_UploadArray(url, array, uploadQty) {

    uploadQty = parseNum(uploadQty);

    if (uploadQty > 1) {

        var startIdx = 0;
        var subArray = [];

        do {
            // Get sub-set of items to upload
            subArray = array.slice(startIdx, startIdx + uploadQty);

            Sync_UpdateServerTable(url, subArray);

            startIdx += uploadQty;
        }
        while (startIdx < array.length);
    }
    else {
        $.each(array, function (idx, item) {
            Sync_UpdateServerTable(url, item);
        });
    }
}

//######
//#### Download data
//######

function Sync_DownloadNews() {
    Sync_DownloadTableData("Sync_DownloadNews", NewsURL, tblNews, Sync_DownloadEnterpriseMasters, 0, 0);
}

function Sync_DownloadEnterpriseMasters() {
    Sync_DownloadTableData("Sync_DownloadEnterpriseMasters", EnterpriseMasterURL, tblEnterpriseMaster, Sync_DownloadCategories, 0, 0);
}

function Sync_DownloadCategories() {
    Sync_DownloadTableData("Sync_DownloadCategories", CategegoriesURL, tblCategoryLookup, Sync_DownloadCustomerTypeLookups, 0, 0);
}

function Sync_DownloadCustomerTypeLookups() {
    Sync_DownloadTableData("Sync_DownloadCustomerTypeLookups", CustomerTypeLookupURL, tblCustomerTypeLookup, Sync_DownloadLandMeasurementLookups, 0, 0);
}

function Sync_DownloadLandMeasurementLookups() {
    Sync_DownloadTableData("Sync_DownloadLandMeasurementLookups", LandMeasurementLookupsURL, tblLandMeasurementLookup, Sync_DownloadGM, 0, 0);
}

function Sync_DownloadGM() {
    Sync_DownloadTableData("Sync_DownloadGM", GMURL, tblGrossMargin, Sync_DownloadStockTransfer, 0, 0);
}

function Sync_DownloadStockTransfer() {
    Sync_DownloadTableData("Sync_DownloadStockTransfer", StockTransfersURL, tblTransfer, Sync_DownloadBalanceSheet, 0, 0);
}

function Sync_DownloadBalanceSheet() {
    Sync_DownloadTableData("Sync_DownloadBalanceSheet", BalanceSheetURL, tblBalanceSheet, Sync_DownloadTradingSummarySheet, 0, 0);
}

function Sync_DownloadTradingSummarySheet() {
    Sync_DownloadTableData("Sync_DownloadTradingSummarySheet", TradingSummaryURL, tblTradingSummary, Sync_DownloadDOF, 0, 0);
}

function Sync_DownloadDOF() {
    Sync_DownloadTableData("Sync_DownloadDOF", DOFURL, tblDOF, Sync_DownloadOverheadCosts, 0, 0);
}

function Sync_DownloadOverheadCosts() {
    Sync_DownloadTableData("Sync_DownloadOverheadCosts", OverheadCostsURL, tblOverheadCost, Sync_DownloadCropSchedules, 0, 0);
}

function Sync_DownloadCropSchedules() {
    Sync_DownloadTableData("Sync_DownloadCropSchedules", CropScheduleURL, tblCropSchedule, Sync_DownloadCapexHeaders, 0, 0);
}

function Sync_DownloadCapexHeaders() {
    Sync_DownloadTableData("Sync_DownloadCapexHeaders", CapexHeaderURL, tblCapexHeader, Sync_DownloadCapexLines, 0, 0);
}

function Sync_DownloadCapexLines() {
    Sync_DownloadTableData("Sync_DownloadCapexLines", CapexLinesURL, tblCapexLine, Sync_DownloadCashflowHeaders, 0, 0);
}

function Sync_DownloadCashflowHeaders() {
    Sync_DownloadTableData("Sync_DownloadCashflowHeaders", CashflowHeaderURL, tblCashflowHeader, Sync_DownloadCashflowLines, 0, 0);
}

function Sync_DownloadCashflowLines() {
    Sync_DownloadTableData("Sync_DownloadCashflowLines", CashflowLinesURL, tblCashflowLine, Sync_DownloadDairyHerdCalHeaders, 0, 0);
}

function Sync_DownloadDairyHerdCalHeaders() {
    Sync_DownloadTableData("Sync_DownloadDairyHerdCalHeaders", DHHeaderURL, tblDairyHerdCalHeader, Sync_DownloadDairyHerdCalLines, 0, 0);
}

function Sync_DownloadDairyHerdCalLines() {
    Sync_DownloadTableData("Sync_DownloadDairyHerdCalLines", DHLinesURL, tblDairyHerdCalLine, Sync_DownloadSubsidiesHeaders, 0, 0);
}

function Sync_DownloadSubsidiesHeaders() {
    Sync_DownloadTableData("Sync_DownloadSubsidiesHeaders", SubsidiesHeaderURL, tblSubsidiesHeader, Sync_DownloadSubsidiesLines, 0, 0);
}

function Sync_DownloadSubsidiesLines() {
    Sync_DownloadTableData("Sync_DownloadSubsidiesLines", SubsidiesLinesURL, tblSubsidiesLine, Sync_DownloadLoanSchedulesHeaders, 0, 0);
}

function Sync_DownloadLoanSchedulesHeaders() {
    Sync_DownloadTableData("Sync_DownloadLoanSchedulesHeaders", LoanScheduleHeaders, tblLoanScheduleHeader, Sync_DownloadLoanSchedulesLines, 0, 0);
}

function Sync_DownloadLoanSchedulesLines() {
    Sync_DownloadTableData("Sync_DownloadLoanSchedulesLines", LoanScheduleLines, tblLoanSchedulesLine, Sync_DownloadRentSchedulesHeaders, 0, 0);
}

function Sync_DownloadRentSchedulesHeaders() {
    Sync_DownloadTableData("Sync_DownloadRentSchedulesHeaders", RentScheduleHeadersURL, tblRentScheduleHeader, Sync_DownloadRentSchedulesLines, 0, 0);
}

function Sync_DownloadRentSchedulesLines() {
    Sync_DownloadTableData("Sync_DownloadRentSchedulesLines", RentScheduleLinesURL, tblRentScheduleLine, Sync_DownloadDairyYoungstockCalHeaders, 0, 0);
}

function Sync_DownloadDairyYoungstockCalHeaders() {
    Sync_DownloadTableData("Sync_DownloadDairyYoungstockCalHeaders", DYURL, tblDairyYoungstockCalHeader, Sync_DownloadDairyYoungstockCalLines, 0, 0);
}

function Sync_DownloadDairyYoungstockCalLines() {
    Sync_DownloadTableData("Sync_DownloadDairyYoungstockCalLines", DYLinesURL, tblDairyYoungstockCalLine, Sync_DownloadBeefRearingCalHeaders, 0, 0);
}

function Sync_DownloadBeefRearingCalHeaders() {
    Sync_DownloadTableData("Sync_DownloadBeefRearingCalHeaders", BRURL, tblBeefRearingCalHeader, Sync_DownloadBeefRearingCalLines, 0, 0);
}

function Sync_DownloadBeefRearingCalLines() {
    Sync_DownloadTableData("Sync_DownloadBeefRearingCalLines", BRLinesURL, tblBeefRearingCalLine, Sync_DownloadOtherRearingCalHeaders, 0, 0);
}

function Sync_DownloadOtherRearingCalHeaders() {
    Sync_DownloadTableData("Sync_DownloadOtherRearingCalHeaders", ORURL, tblOtherRearingCalHeader, Sync_DownloadOtherRearingCalLines, 0, 0);
}

function Sync_DownloadOtherRearingCalLines() {
    Sync_DownloadTableData("Sync_DownloadOtherRearingCalLines", ORLinesURL, tblOtherRearingCalLine, Sync_DownloadBreedingEwesCalHeaders, 0, 0);
}

function Sync_DownloadBreedingEwesCalHeaders() {
    Sync_DownloadTableData("Sync_DownloadBreedingEwesCalHeaders", BEURL, tblBreedingEweCalHeader, Sync_DownloadBreedingEwesCalLines, 0, 0);
}

function Sync_DownloadBreedingEwesCalLines() {
    Sync_DownloadTableData("Sync_DownloadBreedingEwesCalLines", BELinesURL, tblBreedingEweCalLine, Sync_DownloadSucklreCowsCalHeaders, 0, 0);
}

function Sync_DownloadSucklreCowsCalHeaders() {
    Sync_DownloadTableData("Sync_DownloadSucklreCowsCalHeaders", SCURL, tblSucklerCowCalHeader, Sync_DownloadSucklerCowsCalLines, 0, 0);
}

function Sync_DownloadSucklerCowsCalLines() {
    Sync_DownloadTableData("Sync_DownloadSucklerCowsCalLines", SCLinesURL, tblSucklerCowCalLine, Sync_DownloadOtherLivestockCalHeaders, 0, 0);
}

function Sync_DownloadOtherLivestockCalHeaders() {
    Sync_DownloadTableData("Sync_DownloadOtherLivestockCalHeaders", OLLinesURL, tblOtherLivestockCalLine, Sync_DownloadOtherLivestockCalLines, 0, 0);
}

function Sync_DownloadOtherLivestockCalLines() {
    Sync_DownloadTableData("Sync_DownloadOtherLivestockCalLines", OLURL, tblOtherLivestockCalHeader, Sync_DownloadArableCropReconcilHeaders, 0, 0);
}

function Sync_DownloadArableCropReconcilHeaders() {
    Sync_DownloadTableData("Sync_DownloadArableCropsHeaders", ArableCropReconcilHeaderURL, tblArableCropReconcilHeader, Sync_DownloadArableCropLines, 0, 0);
}

function Sync_DownloadArableCropLines() {
    Sync_DownloadTableData("Sync_DownloadArableCropLines", ArableCropReconcilLineURL, tblArableCropReconcilLine, Sync_DownloadOtherCropsHeaders, 0, 0);
}

function Sync_DownloadOtherCropsHeaders() {
    Sync_DownloadTableData("Sync_DownloadOtherCropsHeaders", OthCropHeaderURL, tblOtherCropReconHeader, Sync_DownloadOtherCropsLines, 0, 0);
}

function Sync_DownloadOtherCropsLines() {
    Sync_DownloadTableData("Sync_DownloadOtherCropsLines", OthCropLineURL, tblOtherCropReconLine, Sync_DownloadCustomers, 0, 0);
}

function Sync_DownloadCustomers() {
    Sync_DownloadTableData("Sync_DownloadCustomers", CustomersURL, tblCustomer, Sync_DownloadBudgetDates, 0, 0);
}

function Sync_DownloadBudgetDates() {
    Sync_DownloadTableData("Sync_DownloadBudgetDates", BudgetDatesURL, tblBudgetDate, Sync_DownloadJobTypeLookups, 0, 0);
}

function Sync_DownloadJobTypeLookups() {

    Sync_DownloadTableData("Sync_DownloadJobTypeLookups", JobTypeLookupsURL, tblJobTypeLookup, Sync_DownloadLanguages, 0, 0);
}

function Sync_DownloadLanguages() {

    Sync_DownloadTableData("Sync_DownloadLanguages", LanguageURL, tblLanguage, Sync_DownloadWFNPImportData, 0, 0);
}

function Sync_DownloadWFNPImportData() {

    Sync_DownloadTableData("Sync_DownloadWFNPImportData", WfnpImportURL, tblWfnpImport, Sync_DownloadEnterpriseCustomers, 0, 0);
}

function Sync_DownloadEnterpriseCustomers() {
    Sync_DownloadTableData("Sync_DownloadEnterpriseCustomers", EnterpriseCustomerURL, tblEnterpriseToCustomer, Sync_DownloadConsultantCustomers, 0, 0);
}

function Sync_DownloadConsultantCustomers() {
    Sync_DownloadTableData("Sync_DownloadConsultantCustomers", ConsultantCustomerURL, tblConsultantToCustomer, Sync_DownloadVatRates, 0, 0);
}

function Sync_DownloadVatRates() {
    Sync_DownloadTableData("Sync_DownloadVatRates", VatRatesURL, tblVatRates, Sync_DownloadBudgetWorkflowStatuses, 0, 0);
}

function Sync_DownloadBudgetWorkflowStatuses() {
    Sync_DownloadTableData("Sync_DownloadBudgetWorkflowStatuses", BudgetWorkflowStatusURL, tblBudgetWorkflowStatus, Sync_IncomeScheduleHeaders, 0, 0);
}

function Sync_IncomeScheduleHeaders() {
    Sync_DownloadTableData("Sync_IncomeScheduleHeaders", IncomeScheduleHeadersURL, tblIncomeScheduleHeader, Sync_IncomeScheduleItems, 0, 0);
}

function Sync_IncomeScheduleItems() {
    Sync_DownloadTableData("Sync_IncomeScheduleItems", IncomeScheduleItemsURL, tblIncomeScheduleItem, Sync_DownloadTsdgVisits, 0, 0);
}

/*
function Sync_DownloadBenchmarks() {
    Sync_DownloadTableData("Sync_DownloadBenchmarks", BenchmarkURL, tblBenchmark, Sync_DownloadBenchmarkTypeLookups, 0, 0);
}

function Sync_DownloadBenchmarkTypeLookups() {
    Sync_DownloadTableData("Sync_DownloadBenchmarkTypeLookups", BenchmarkTypeLookupURL, tblBenchmarkLookup, Sync_DownloadBudgets, 0, 0);
}

function Sync_DownloadBudgets() {
    Sync_DownloadTableData("Sync_DownloadBudgets", BudgetURL, tblBudget, Sync_DownloadBudgetScreenTypes, 0, 0);
}

function Sync_DownloadBudgetScreenTypes() {
    Sync_DownloadTableData("Sync_DownloadBudgetScreenTypes", BudgetScreenTypeURL, tblBudgetScreenType, Sync_DownloadBusinessTradings, 0, 0);
}

function Sync_DownloadBusinessTradings() {
    Sync_DownloadTableData("Sync_DownloadBusinessTradings", BusinessTradingURL, tblBusinessTrading, Sync_DownloadBusinessTradingLines, 0, 0);
}

function Sync_DownloadBusinessTradingLines() {
    Sync_DownloadTableData("Sync_DownloadBusinessTradingLines", BusinessTradingLinesURL, tblBusinessTradingLine, Sync_DownloadCashflows, 0, 0);
}

function Sync_DownloadCashflows() {
    Sync_DownloadTableData("Sync_DownloadCashflows", CashflowURL, tblCashflow, Sync_DownloadCashflowTypes, 0, 0);
}

function Sync_DownloadCashflowTypes() {
    Sync_DownloadTableData("Sync_DownloadCashflowTypes", CashflowTypeURL, tblCashflowType, Sync_DownloadCustomerTypeLookups, 0, 0);
}

function Sync_DownloadCustomerTypeLookups() {
    Sync_DownloadTableData("Sync_DownloadCustomerTypeLookups", CustomerTypeLookupURL, tblCustomerTypeLookup, Sync_DownloadEnterpriseMasters, 0, 0);
}

function Sync_DownloadHeadersLookups() {
    Sync_DownloadTableData("Sync_DownloadHeadersLookups", HeaderLookupsURL, tblHeadersLookup, Sync_DownloadJobTypeLookups, 0, 0);
}

function Sync_DownloadLandMeasurementLookups() {
    Sync_DownloadTableData("Sync_DownloadLandMeasurementLookups", LandMeasurementLookupsURL, tblLandMeasurementLookup, Sync_DownloadLanguageOptions, 0, 0);
}

function Sync_DownloadLanguageOptions() {
    Sync_DownloadTableData("Sync_DownloadLanguageOptions", LanguageOptionsURL, tblLanguageOption, Sync_DownloadOpeningBalanceSheets, 0, 0);
}

function Sync_DownloadOpeningBalanceSheets() {
    Sync_DownloadTableData("Sync_DownloadOpeningBalanceSheets", OpeningBalanceSheetsURL, tblOpeningBalancesheet, Sync_DownloadOptions, 0, 0);
}

function Sync_DownloadOptions() {
    Sync_DownloadTableData("Sync_DownloadOptions", OptionsURL, tblOption, Sync_DownloadOptionLines, 0, 0);
}

function Sync_DownloadOptionLines() {
    Sync_DownloadTableData("Sync_DownloadOptionLines", OptionLinesURL, tblOptionLine, Sync_DownloadPageTypeLookups, 0, 0);
}

function Sync_DownloadPageTypeLookups() {
    Sync_DownloadTableData("Sync_DownloadPageTypeLookups", PageTypeLookupURL, tblPageTypeLookup, Sync_DownloadOpeningBudgetDates, 0, 0);
}

function Sync_DownloadOpeningBudgetDates() {
    Sync_DownloadTableData("Sync_DownloadOpeningBudgetDates", OpeningBudgetDatesURL, tblOpeningBudgetDate, Sync_DownloadTsdgVisits, 0, 0);
}*/

function Sync_DownloadTsdgVisits() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisits", TsdgVisitURL, tblTsdgVisit, Sync_DownloadTsdgVisitBalShtSmrys, 0, 0, true);
}

function Sync_DownloadTsdgVisitBalShtSmrys() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitBalShtSmrys", TsdgVisitBalShtSmryURL, tblTsdgVisitBalShtSmry, Sync_DownloadTsdgVisitBusRiskAreas, 0, 0, true);
}

function Sync_DownloadTsdgVisitBusRiskAreas() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitBusRiskAreas", TsdgVisitBusRiskAreaURL, tblTsdgVisitBusRiskArea, Sync_DownloadTsdgVisitBusTrdngSmrys, 0, 0, true);
}

function Sync_DownloadTsdgVisitBusTrdngSmrys() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitBusTrdngSmrys", TsdgVisitBusTrdngSmryURL, tblTsdgVisitBusTrdngSmry, Sync_DownloadTsdgVisitKtpis, 0, 0, true);
}

function Sync_DownloadTsdgVisitKtpis() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitKtpis", TsdgVisitKtpiURL, tblTsdgVisitKtpi, Sync_DownloadTsdgVisitOppActions, 0, 0, true);
}

function Sync_DownloadTsdgVisitOppActions() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitOppActions", TsdgVisitOppActionURL, tblTsdgVisitOppAction, Sync_DownloadTsdgVisitProfitReqrmnts, 0, 0, true);
}

function Sync_DownloadTsdgVisitProfitReqrmnts() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitProfitReqrmnts", TsdgVisitProfitReqrmntURL, tblTsdgVisitProfitReqrmnt, Sync_DownloadTsdgVisitProprtnlAnals, 0, 0, true);
}

function Sync_DownloadTsdgVisitProprtnlAnals() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitProprtnlAnals", TsdgVisitProprtnlAnalURL, tblTsdgVisitProprtnlAnal, Sync_DownloadTsdgVisitAnlMlkSales, 0, 0, true);
}

function Sync_DownloadTsdgVisitAnlMlkSales() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitAnlMlkSales", TsdgVisitAnlMlkSaleURL, tblTsdgVisitAnlMlkSale, Sync_DownloadTsdgVisitEntprs, 0, 0, true);
}

function Sync_DownloadTsdgVisitEntprs() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitEntprs", TsdgVisitEntprsURL, tblTsdgVisitEntprs, Sync_DownloadTsdgVisitKtpiCtgryLkps, 0, 0, true);
}

function Sync_DownloadTsdgVisitKtpiCtgryLkps() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitKtpiCtgryLkps", TsdgVisitKtpiCtgryLkpSyncURL, tblTsdgVisitKtpiCtgryLkp, Sync_DownloadTsdgVisitEntprsNameLkps, 0, 0, true);
}

function Sync_DownloadTsdgVisitEntprsNameLkps() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitEntprsNameLkps", TsdgVisitEntprsNameLkpSyncURL, tblTsdgVisitEntprsNameLkp, Sync_DownloadTsdgVisitBusStrengths, 0, 0, true);
}

function Sync_DownloadTsdgVisitBusStrengths() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitBusStrengths", TsdgVisitBusStrengthSyncURL, tblTsdgVisitBusStrength, Sync_DownloadTsdgVisitBusStrengthNameLkps, 0, 0, true);
}

function Sync_DownloadTsdgVisitBusStrengthNameLkps() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitBusStrengthNameLkps", TsdgVisitBusStrengthNameLkpSyncURL, tblTsdgVisitBusStrengthNameLkp, Sync_DownloadTsdgVisitBusRiskAreaDescLkps, 0, 0, true);
}

function Sync_DownloadTsdgVisitBusRiskAreaDescLkps() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitBusRiskAreaDescLkps", TsdgVisitBusRiskAreaDescLkpSyncURL, tblTsdgVisitBusRiskAreaDescLkp, Sync_DownloadTsdgVisitAtchmnts, 0, 0, true);
}

function Sync_DownloadTsdgVisitAtchmnts() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitAtchmnts", TsdgVisitAtchmntSyncURL, tblTsdgVisitAtchmnt, Sync_DownloadTsdgVisitMgmtInfoSrcs, 0, 0, true);
}

function Sync_DownloadTsdgVisitMgmtInfoSrcs() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitMgmtInfoSrcs", TsdgVisitMgmtInfoSrcSyncURL, tblTsdgVisitMgmtInfoSrc, Sync_DownloadTsdgVisitMgmtInfoSrcNameLkps, 0, 0, true);
}

function Sync_DownloadTsdgVisitMgmtInfoSrcNameLkps() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitMgmtInfoSrcNameLkps", TsdgVisitMgmtInfoSrcNameLkpSyncURL, tblTsdgVisitMgmtInfoSrcNameLkp, Sync_DownloadTsdgVisitWorkflowStatuses, 0, 0, true);
}

function Sync_DownloadTsdgVisitWorkflowStatuses() {

    Sync_DownloadTableData("Sync_DownloadTsdgVisitWorkflowStatuses", TsdgVisitWorkflowStatusSyncURL, tblTsdgVisitWorkflowStatus, null, 0, 0, true);
}

/**
 * Downloads data for the specified table from the server and stores it in the local db.
 * @param {any} retryProc ? From OBI.
 * @param {string} url API URL to get data from.
 * @param {string} tbl Table to download for.
 * @param {{() => void}} callBackFunction Function to call once download succeeds.
 * @param {any} addModifiedDataCol ? From OBI.
 * @param {any} addServerDataCol ? From OBI.
 * @param {boolean} [preserveUnsubmitted] Flag indicating if unsubmitted local table data should not be overwritten with data from server.
 * @returns {void}
 */
function Sync_DownloadTableData(retryProc, url, tbl, callBackFunction, addModifiedDataCol, addServerDataCol, preserveUnsubmitted) {

    try {

        var syncRequestData = {
            SyncID: mSyncID
            //ChangesOnly: mSyncChangesOnly - todo set this if/when we need to override mSyncChangesOnly for a particular table 
        };

        $.ajax({
            url: url,
            data: syncRequestData,
            type: "GET",
            async: false,
            beforeSend: function (xhr) {
                // Apply authorization header to the request, which will be picked up on server by AuthenticationFilter/AuthorisationFilter
                ApplyTokenAuthorizationHeader(xhr, mSyncCredentials);
            }
        })
            .done(function (data) {

                if (DoesArrayFirstItemExist(data)) {

                    Sync_Message("Downloaded " + data.length + " rows for " + tbl);

                    if (preserveUnsubmitted) {
                        // Delete local submitted/unchanged data, and insert downloaded data whilst preserving un-submitted local data

                        var store = mSyncStoreTransaction.objectStore(tbl);
                        var primaryKeyName = store.keyPath; // Get the store's 'primary key' column/index name

                        // Get the keys of items marked as unsubmitted
                        var defUnsubmittedKeys = Sync_QueryLocalDatabaseTransactionDeferred(tbl, function filter(itm) { return itm.ModifiedData === false; }, function transform(itm) { return itm[primaryKeyName]; });

                        // Get the keys of items marked as submitted or that are unchanged
                        var defOtherKeys = Sync_QueryLocalDatabaseTransactionDeferred(tbl, function filter(itm) { return itm.ModifiedData !== false; }, function transform(itm) { return itm[primaryKeyName]; });

                        $.when(defUnsubmittedKeys, defOtherKeys).then(function (unsubmittedKeys, otherKeys) {
                            // Delete the 'others'
                            Sync_DeleteLocalDatabaseTransactionDeferred(tbl, otherKeys)
                                .done(function () {

                                    var item;

                                    // Insert each downloaded item into IndexedDB only if its key isn't one of the unsubmitted keys
                                    for (var idx = 0; idx < data.length; idx++) {
                                        item = data[idx];

                                        if (unsubmittedKeys.indexOf(item[primaryKeyName]) === -1) {
                                            try {
                                                store.add(item);
                                            } catch (e) {
                                                console.error("Error adding to store " + tbl + " " + e);
                                            }
                                        }
                                    }
                                });
                        });
                    }
                    else {
                        // Update the record if it already exists in indexDB, insert it if it does not already exist

                        var store = mSyncStoreTransaction.objectStore(tbl);

                        if (DoesArrayFirstItemExist(data)) {
                            for (var idx = 0; idx < data.length; idx++) {
                                store.put(data[idx]);
                            }
                        }
                    }
                }
                else {
                    Sync_Message("Downloaded no rows for " + tbl);
                }

                if (typeof callBackFunction === "function") {
                    callBackFunction.call(null);
                }
            })
            .fail(function (xhr, textStatus, errorThrown) {

                var exceptionMessage;

                try {
                    exceptionMessage = xhr.responseJSON.ExceptionMessage;
                } catch (e) {
                }

                alert("Sync failed downloading table " + tbl + " from url " + url + " " + exceptionMessage + " " + textStatus + " " + errorThrown);
            });

    }
    catch (e) {
        Sync_HandleError(e);
        alert("error Sync_DownloadTable for table " + tbl + " " + e);
    }
}

function Sync_EnableScreen() {

    BusyMessage.hide();
}

function Sync_QueryLocalDatabaseTransactionDeferred(dbTableName, filterFn, transformFn) {

    var deferred = $.Deferred();

    var callBackFunction = function (response) {

        // filterFn should be something like
        // function (elementOfArray[, indexInArray]) { return elementOfArray.Deleted == "False"; })

        // transformFn should be something like
        // function (valueOfElement) { return valueOfElement.ID; }

        //var jsonArray = JSON.parse(JSON.stringify(response)); // Seems to work without this?
        var jsonArray = response;

        // Apply filter
        if (typeof filterFn === "function") {
            jsonArray = $.grep(jsonArray, filterFn);
        }

        // Apply transform to each element
        if (typeof transformFn === "function") {
            var transformed;

            $.each(jsonArray, function (indexInArray, valueOfElement) {
                transformed = transformFn(valueOfElement);
                jsonArray[indexInArray] = transformed;
            });
        }

        deferred.resolve(jsonArray);
    };

    Sync_QueryLocalDatabaseTransaction(dbTableName, null, null, callBackFunction);

    return deferred.promise();
}

/**
 * Sync_DeleteLocalDatabaseTransactionDeferred : Deletes rows from IndexedDB using the existing transaction and handles the async callback.
 * dbTableName : Name of the IndexedDB store to delete from.
 * primaryKeyVals: A single primary key value, or array of primary key values, that identify the rows to delete.
 */
function Sync_DeleteLocalDatabaseTransactionDeferred(dbTableName, primaryKeyVals) {

    var deferred = $.Deferred();

    var store = mSyncStoreTransaction.objectStore(dbTableName);

    if (!$.isArray(primaryKeyVals)) {
        // Make array of 1 item
        primaryKeyVals = [primaryKeyVals];
    }

    if (!DoesArrayFirstItemExist(primaryKeyVals)) {
        // Nothing to delete, so resolve immediately
        deferred.resolve();
    }
    else {
        // Delete the row for each key
        (function DeleteRow(pkv, idx) {

            var deleteRequest = store.delete(pkv);

            deleteRequest.onsuccess = function (event) {

                // Look for the next key to delete
                var nextIdx = idx + 1;
                var nextPkv = primaryKeyVals[nextIdx];

                if (nextPkv != undefined) {
                    // Recursively delete each key's row
                    DeleteRow(nextPkv, nextIdx);
                }
                else {
                    // No more to delete
                    deferred.resolve();
                }
            };

            deleteRequest.onerror = function (event) {

                alert("deleteRequest error for table " + tbl + ": " + event);

                deferred.reject();
            };

        })(primaryKeyVals[0], 0); // Started by deleting the first key's row
    }

    return deferred.promise();
}

function Sync_QueryLocalDatabaseTransaction(dbTableName, indexName, keyRange, callBackFunction, callBackArgs) {

    try {
        mSyncQueryingLocalData = true;
        var objectStore = mSyncStoreTransaction.objectStore(dbTableName);

        if (indexName) {
            var index;

            try {
                index = objectStore.index(indexName);
            }
            catch (e) { //Ignore
            }
        }

        var range;

        if (keyRange) {
            try {
                range = IDBKeyRange.only(keyRange);
            } catch (e) { //Ignore
            }
        }

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

        var results = [];

        cursorRequest.onsuccess = function () {

            var xcursor = cursorRequest.result;

            if (xcursor) {
                //Sync_Message(xcursor.value);
                results.push(xcursor.value);
                xcursor.continue();
            }
            else {
                if (typeof callBackFunction === "function") {
                    callBackFunction.call(null, results);
                }
                else {
                    window[callBackFunction](results, callBackArgs);
                }
            }
        };
    }
    catch (e) {
        console.error("dbTableName " + dbTableName + " " + e.message);
        Sync_HandleError(e);
    }
}

/**
 * Uploads a database item or array of items to the server for storage in the server database.
 * @param {string} strUrl URL of web service method that will store the data in the server database.
 * @param {Object|[]} dataToSend Single object, or array of objects, to upload and store.
 * @param {Function} onSuccess
 * @param {Function} onSuccessArgs
 */
function Sync_UpdateServerTable(strUrl, dataToSend, onSuccess, onSuccessArgs) {

    try {
        mSyncSendingData = true;

        var ajaxSettings = {
            url: strUrl,
            data: dataToSend,
            type: "POST",
            async: false,
            beforeSend: function (xhr) {
                // Apply authorization header to the request, which will be picked up on server by AuthenticationFilter/AuthorisationFilter
                ApplyTokenAuthorizationHeader(xhr, mSyncCredentials);
            }
        };

        if ($.isArray(dataToSend)) {

            dataToSend.forEach(function (item) {
                item.SyncID = mSyncID; // Tack this on for holding table insert
            });

            // Further settings reqd by Web API model binding to support posting an array of complex objects
            ajaxSettings.data = JSON.stringify(dataToSend);
            ajaxSettings.traditional = true;
            ajaxSettings.contentType = "application/json; charset=utf-8";
            ajaxSettings.dataType = "json";
        }
        else {
            dataToSend.SyncID = mSyncID; // Tack this on for holding table insert
        }

        $.ajax(ajaxSettings)
            .done(function (returnVal) {
                //  All sync uploads should return true if successful
                if (!returnVal) {
                    // Set this flag to trigger display of upload error msg and prevent downloads starting after all uploads have completed
                    mSyncError = "Sync error uploading to " + strUrl;
                }
                else if (onSuccess) {
                    if (typeof onSuccess === "function") {
                        onSuccess.call(null, onSuccessArgs);
                    }
                    else {
                        window[onSuccess](onSuccessArgs);
                    }
                }
            })
            .fail(function (xhr) {
                Sync_HandleError(xhr);
            });
    }
    catch (e) {
        Sync_HandleError(e);
    }
}

function Sync_HandleError(e) {

    try {
        console.error(e);
        var errorDescription = "Error:";
        var processTask = "Process:";
        if (e !== null && e.message) {
            errorDescription += e.message;
        }
        if (e !== null && e.target) {
            if (e.target.errorCode) {
                errorDescription += e.target.errorCode;
            }
        }
        if (e !== null && e.statusText) {
            if (e.statusText != "error") {
                errorDescription += e.statusText;
            }
        }
        if (e !== null && e.responseText) {
            errorDescription += e.responseText;
        }
        if (typeof e === "string") {
            errorDescription = e;
        }
        if (mSyncRetryProc) {
            processTask += mSyncRetryProc;
        }
        if (mSyncStoringLocalData) {
            processTask += "Storing local data";
        }
        if (mSyncQueryingLocalData) {
            processTask += "Querying local data";
        }
        if (mSyncSendingData) {
            processTask += "Sending local data";
        }
        if (mSyncRequestingData) {
            processTask += "Requesting data";
        }
        if (StringIsNullOrEmpty(errorDescription)) {
            errorDescription = "";
        }
        if (StringIsNullOrEmpty(processTask)) {
            processTask = "";
        }

        Sync_StoreError("Sync error handler: " + errorDescription + "; " + processTask);

        try {
            mSyncStoreTransaction.abort();
        }
        catch (ex) {
            console.log("tx already disposed");
        }

        Sync_EnableScreen();
        mSyncOnCompletedFn.call(null, false, errorDescription);
    }
    catch (e) {
        Sync_StoreError("Error in Sync error handler: " + e.message);

        try {
            mSyncStoreTransaction.abort();
        } catch (e) {
            console.log(e.message);
        }
    }
}

function Sync_StoreError(errorMsg) {
    //  todo - store in IndexedDB Error table
    console.error(errorMsg);
}
