// Shared settings and functions

/**
 * Used by function 'ShowAlertOnce' to prevent alert message showing until a period of time has elapsed.
 * @type {number}
 */
var ShowAlertOnce_LastShown = 0;

/**
 * Flag to indicate if User can/cannot edit current Customer's details.
 * @type {boolean}
 */
var CustomerEditingMode = false; //Trying global var for performance reasons

/**
 * Determines if the given string is in a valid email address format.
 * @param {string} email The string to test.
 * @return {boolean} Returns a value indicating if the string is a valid email address or not.
 */
function validateEmail(email) {

    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    //console.log(re.test(email));
    return re.test(email);
}

/**
  * Returns true if the record has NOT been set as 'soft deleted'. Will handle situation where no column exists due to not implemented in code.
  * @param {string} softDeletedColValue The value from the 'soft-deleted' column (which might not exist yet).
  * @returns {boolean} True/false indicating if record is 'soft deleted' or not.
 */
function NotSoftDeleted(softDeletedColValue) {

    if (softDeletedColValue === undefined || softDeletedColValue === null) {
        return true;
    }
    else {
        return !CheckValueIsBoolean(softDeletedColValue);
    }
}

/**
 * Converts a value to boolean.
 * @param {any} val Value to convert.
 * @returns Returns the value converted to boolean.
 */
function CheckValueIsBoolean(val) {

    var num = +val;
    return !isNaN(num) ? !!num : !!String(val).toLowerCase().replace(!!0, '');
}

function RegExpEsc(str) {

    str = str + "";

    //RegExp.escape = function (string) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    //};
}

function GetUserLanguage() {

    if (window.localStorage.Language) {
        return window.localStorage.Language;
    }
    else
        return '';
}

/**
 * Performs an 'inner join' on 2 arrays, i.e. returns rows from 1st array only where there is a matching item in the 2nd array.
 * @param {Array} data1 First array.
 * @param {Array} data2 Second array.
 * @param {string} joinBy1 Field name in first array.
 * @param {string} joinBy2 Field name in second array.
 * @returns {Array} An array containing the joined items.
 */
function JoinObjectArrays(data1, data2, joinBy1, joinBy2) {

    var joinData = [];

    if (data1 && data2) {
        var data2Map = data2.map(function (e) { return e[joinBy2]; });

        for (var data1Idx = 0; data1Idx < data1.length; data1Idx++) {
            var data2MapIdx = $.inArray(data1[data1Idx][joinBy1], data2Map);

            if (data2MapIdx >= 0) {
                if (stringIsNullOrEmpty(data1[data1Idx][joinBy1]) || stringIsNullOrEmpty(data2[data2MapIdx][joinBy2])) {
                    continue;
                }

                var lineData = $.extend({}, data1[data1Idx], data2[data2MapIdx]);
                joinData.push(lineData);
            }
        }
    }

    return joinData;
}

function LeftOuterJoinObjectArrays(data1, data2, joinBy1, joinBy2) {

    var joinData = [];

    if (data1 && data2) {
        var arrMap = data2.map(function (e) {
            return e[joinBy2];
        });

        for (var x = 0; x < data1.length; x++) {
            var y = $.inArray(data1[x][joinBy1], arrMap);

            if (y >= 0) {
                if (stringIsNullOrEmpty(data1[x][joinBy1]) || stringIsNullOrEmpty(data2[y][joinBy2]))
                    continue;

                var lineData = $.extend({}, data1[x], data2[y]);
                joinData.push(lineData);
            }
            else {
                joinData.push(data1[x]);
            }
        }
    }
    else {
        joinData = data1;
    }

    return joinData;
}

/**
 * Performs a left-join on 2 arrays, returning a new array containing each item from the first array with, where possible, a corresponding item from the second array merged with the item from the first array.
 * If no match is found in the second array, the item from the first array is returned, unchanged.
 * @param {[]} array1 The first (left side) array.
 * @param {[]} array2 The second (right side) array.
 * @param {string} joinBy1 Name of a field in the first array's items whose value will be compared with joinBy2 items.
 * @param {string} joinBy2 Name of the field in the second array's items whose value will be compared with joinBy1 items.
 * @param {boolean} [matchOnNull] Optional flag specifying whether joining can take place when the join fields' values are null. Default is false.
 */
function LeftOuterJoinObjectArrays2(array1, array2, joinBy1, joinBy2, matchOnNull) {

    var joinedData = [], lineData;

    if (array1 && array2) {
        var arrMap = array2.map(function (e) {
            return '' + e[joinBy2];
        });

        for (var x = 0; x < array1.length; x++) {
            if (!stringIsNullOrEmpty(array1[x][joinBy1])) {
                var y = $.inArray(array1[x][joinBy1].toString(), arrMap);

                if (y >= 0) {
                    lineData = $.extend({}, array1[x], array2[y]);
                    joinedData.push(lineData);
                }
                else {
                    joinedData.push(array1[x]);
                }
            }
            else {
                //Join property did not exist in data1 item

                if (matchOnNull) {
                    // Extend data1 item with the data2 item whose join field is null
                    var data2ItemWithNullJoinBy = $.grep(array2, function (itm, idx) { return itm[joinBy2] == null; }, null)[0];

                    $.extend(array1[x], data2ItemWithNullJoinBy);
                }

                joinedData.push(array1[x]);
            }
        }
    }
    else {
        joinedData = array1;
    }

    return joinedData;
}

/**
 * Applies an Authorization header to the XmlHttpRequest, containing Username and login Token encoded as a base-64 string.
 * This can be picked up on server by AuthenticationFilter to authenticate the request, and AuthorisationFilter to authorise a request.
 * @param {JQueryXHR} xhr XML HTTP Request to apply the header to.
 * @param {Credentials} credentials Login credentials.
 */
function ApplyTokenAuthorizationHeader(xhr, credentials) {

    xhr.setRequestHeader('Authorization', "Basic " + btoa(credentials.Username + ":" + credentials.Token));
}

/**
 * Determines if the array's first item exists and has a non-null value.
 * @param {[]} arr The array to check.
 * @return {Boolean} A value indicating if the array's first item is non-null.
 */
function DoesArrayFirstItemExist(arr) {

    if (arr && arr.length > 0 && arr[0] != null) {
        return true;
    }

    return false;
}

/**
 * Loads external page into element.
 * @param {HTMLElement|string} element DOM element to load into
 * @param {string} source Url of page to load
 * @param {boolean} execDataMain Flag specifying whether or not to find and run the data-main function in source page's DOM.
 */
function LoadExternalPage(element, source, execDataMain) {

    // BusySpinner(true);

    $(element).load(source, function (response, status, xhr) {

        if (status == "error") {
            alert("error " + xhr.status + " : " + xhr.statusText);
        }
        else if (execDataMain) {
            // Look for data-main function
            var mainFunc = $(element).find("script").attr("data-main");

            if (!stringIsNullOrEmpty(mainFunc)) {
                var fn = window[mainFunc];

                if (typeof fn === "function") {
                    fn.call(null);
                }
                else {
                    console.error("data-main function '" + mainFunc + "' not found in " + source);
                }
            }
            else {
                console.error("data-main attribute not found in " + source);
            }
        }

        //	BusySpinner(false);

    });
}

/**
  * Populates a select element.
  * @param {JQuery<HTMLElement>} dropdownElem Select element to populate.
  * @param {[]} dataItems Array of name-value pairs to form the select's options.
  * @param {string} valueField Name of property in each dataItem to use as option value.
  * @param {string} textField Name of property in each dataItem to use as option text.
  * @param {string} [orderBy] Optional name of property in each dataItem by which to order the list items. Defaults to textField.
  */
function PopulateDropdown(dropdownElem, dataItems, valueField, textField, orderBy) {

    if (DoesArrayFirstItemExist(dataItems)) {
        if (orderBy == null) {
            orderBy = textField;
        }

        Linqify(dataItems)
            .OrderBy(function (item) { return item[orderBy]; })
            .ForEach(function (idx, item) {

                var optionElem = $("<option>", {
                    value: item[valueField],
                    text: item[textField]
                });

                dropdownElem.append(optionElem);
            });
    }
}

/**
 * Generates a random GUID.
 * @returns {string} Returns a GUID as a string.
 */
function GenerateGuid() {

    var d = new SystemDate.Now().getTime();

    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });

    return uuid;
}

/**
 * Allows overriding the current system date/time. Use in place of 'new Date()'.
 */
var SystemDate = {

    _defaultNowFunc: function () {
        return new Date();
    },

    _overrideNowFunc: null,

    /**
     * Returns the current Date object using SystemDate's now-date-generating function.
     * @return {Date}
     */
    Now: function () {
        return SystemDate._overrideNowFunc ? SystemDate._overrideNowFunc.call(null) : SystemDate._defaultNowFunc.call(null);
    },

    /**
     * Overrides SystemDate's now-date-generating function with a custom one.
     * @param {Function} fn The custom function.
     */
    Override: function (fn) {
        SystemDate._overrideNowFunc = fn;

        return SystemDate; // Enable method chanining
    },

    /**
     * Resets SystemDate's now-date-generating function to the default one.
     */
    Reset: function () {
        SystemDate._overrideNowFunc = null;

        return SystemDate; // Enable method chaining
    }
};

/**
 * Converts a JS Date to "yyyy-MM-ddTHH:mm:ss.ttttttt" format, which can then be parsed by .NET
 * @param {Date} date The data to convert.
 * @returns {string} Returns a string that can be passed to the server.
 */
function DateToNeutralString(date) {

    var str = "";
    str += PadLeft(date.getFullYear(), 4, "0") + "-";
    str += PadLeft(date.getMonth() + 1, 2, "0") + "-";
    str += PadLeft(date.getDate(), 2, "0") + "T";
    str += PadLeft(date.getHours(), 2, "0") + ":";
    str += PadLeft(date.getMinutes(), 2, "0") + ":";
    str += PadLeft(date.getSeconds(), 2, "0") + ".";
    str += PadLeft(date.getMilliseconds(), 7, "0");

    return str;
}

/**
 * Pads a string on the left with a character up to the given max length.
 * @param {string} num The string to pad.
 * @param {number} maxLen Max length to return.
 * @param {string} padChar The character to pad with. Defaults to zero if not supplied.
 */
function PadLeft(str, maxLen, padChar) {

    return Array(maxLen - String(str).length + 1).join(padChar || "0") + str;
}

/**
 * Converts the date to a string in the given format.
 * @param {string|Date} dateObj The date or date-string to convert.
 * @param {string} pattern The date formatting pattern.
 */
function FormatDate(dateObj, pattern) {

    if (dateObj == null) {
        return "";
    }

    if (typeof dateObj === "string") {
        if (stringIsNullOrEmpty(dateObj)) {
            return "";
        }

        // Assume string is in ISO-8601 format yyyy-MM-dd[THH:mm:ss] (will be if data comes from Web API as a .NET datetime)

        // Check for dd/MM/yyyy format (will be if selected by jquery datepicker and not yet uploaded) and convert to yyyy-MM-dd

        var indices = [];

        for (var i = 0; i < dateObj.length; i++) {
            if (dateObj[i] === "/") {
                indices.push(i);
            }
        }

        if (indices.length > 0) {
            if (DoArraysMatch(indices, [2, 5])
                || DoArraysMatch(indices, [2, 4])
                || DoArraysMatch(indices, [1, 4])
                || DoArraysMatch(indices, [1, 3])) {

                var parts = dateObj.split("/");

                dateObj = parts[2] + "-" + PadLeft(parts[1], 2, "0") + "-" + PadLeft(parts[0], 2, "0");
            }
            else {
                console.error("FormatDate: Unexpected date format " + dateObj);
                return "";
            }
        }

        dateObj = new Date(dateObj);
    }

    var formatted = NaN;

    if (!isNaN(dateObj)) {
        // See date-util.js
        formatted = dateObj.format(pattern, "en-gb"); // todo - make locale dynamic for non-GB devices
    }

    return formatted;
}

function FormatCurrency(currencyStr, decimalPlaces) {

    if (isNaN(currencyStr)) {
        return currencyStr;
    }

    if (isNaN(decimalPlaces)) {
        decimalPlaces = 2;
    }

    var options = {
        region: 'en-GB', // todo - make locale dynamic for non-GB devices
        roundToDecimalPlace: decimalPlaces
    };

    var tmpElem = $("<span>" + currencyStr + "</span>");

    tmpElem.formatCurrency(options);

    return tmpElem.text();
}

/**
 * ifNaN : checks if a number is NaN or infinite, and returns that number if not, or a default number if it is.
 * num : The number to check.
 * defaultVal : The value to return if num is not a number or is infinite.
 */
function ifNaN(num, defaultVal) {

    if (isNaN(num) || !isFinite(num)) {
        return defaultVal;
    }

    return num;
}

/**
 * Tries to parse a value as a float and returns the number if successful, else returns a default number.
 * @param {string|number} str The value to parse.
 * @param {number} [defaultVal] The optional default value to return if parsing fails. Zero is used if not supplied.
 * @param {boolean} [ignoreCommas] Optional flag indicating commas will be ignored, i.e. if true, '1,000' would be seen as '1000'. Default is true.
 * @returns {number} Returns either the parsed number or a default number.
 */
function parseNum(str, defaultVal, ignoreCommas) {

    if (str === undefined || str === null) {
        return defaultVal !== undefined ? defaultVal : 0;
    }

    if (ignoreCommas !== false) {
        // Remove commas
        str = ("" + str).replace(/,/g, "");
    }

    var num = parseFloat(str);

    if (isNaN(num)) {
        return defaultVal != undefined ? defaultVal : 0;
    }

    return num;
}

/**
 * Applies the jQuery autosize extension to the specified textarea or, if not supplied, the element that currently has focus
 * @param {JQuery<HTMLElement>} textArea The textarea.
 */
function applyAutosize(textArea) {

    textArea = $(textArea || window.document.activeElement);

    textArea.autosize();
}

/**
 * Returns a value indicating if the browser is currently online.
 * @returns {boolean} 
 */
function IsOnline() {

    return window.navigator.onLine;
    //return false; // Use this line to mimic being offline
}

/**
 * Builds a URL to download a TSDG attachment.
 * @param {string} atchmntId The TSDG attachment id Guid (TsdgVisitAtchmnt_ID).
 * @param {Credentials} tokenCreds Logged-in user's token credentials.
 */
function BuildAtchmntDownloadUrl(atchmntId, tokenCreds) {

    var downloadHref = TsdgVisitAtchmntDownloadURL + "?atchmntId=" + atchmntId + "&username=" + encodeURI(tokenCreds.Username) + "&token=" + tokenCreds.Token;

    return downloadHref;
}

/**
 * Gets the value of a querystring param.
 * @param {any} variable Name of the querystring param whose value is wanted.
 */
function getQueryVariable(variable) {

    var query = window.location.search.substring(1);
    var vars = query.split('&');
    var pair;

    for (var i = 0; i < vars.length; i++) {
        pair = vars[i].split('=');

        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    //console.log('Query variable %s not found', variable);
}

///** This runs when page loads */
//$(function () {

//    if (getQueryVariable("clearcache")) {
//        ClearClientData();
//    }

//});

function ClearClientData() {

    indexedDB.deleteDatabase(DBName);
    localStorage.clear();
    sessionStorage.clear();
    alert("Your local database has now been reset.");
    location.href = LoginPageURL;

}

/**
 * Transforms an array into a new set, converting each item with the specified transform function.
 * @param {[]} arr The array to be transformed.
 * @param {function} transformFn A function with which to transform each item.
 * @param {boolean} [returnFirstItemOnly] Optional flag to return only the first item from the array. Default is false (return all items).
 */
function ArrayTransform(arr, transformFn, returnFirstItemOnly) {

    if ($.isArray(arr) === false) {
        throw new Error("And array must be provided");
    }

    if (typeof transformFn !== "function") {
        throw new Error("Transform function must be provided");
    }

    var transformedItems = [];
    var transformed;
    var idx;

    for (idx = 0; idx < arr.length; idx++) {

        transformed = transformFn.call(null, arr[idx]);

        if (transformed === undefined) {
            throw new Error("undefined return by transform function '" + transformFn.toString() + "' for item " + arr[idx]);
        }

        transformedItems.push(transformed);
    }

    return returnFirstItemOnly ? transformedItems[0] : transformedItems;
}

/**
 * Like $.grep but also transforms the results.
 * @param {Array<any>} arr Array to be filtered.
 * @param {function} filterFn Predicate function to filter items with.
 * @param {function} [transformFn] Optional function to transform each matching item.
 * @param {boolean} [returnFirstItemOnly] Optional flag specifying whether to return only the first matching item as a single object. Otherwise an array of all matching items is returns.
 * @return {[]|object}
 */
function grepTransform(arr, filterFn, transformFn, returnFirstItemOnly) {

    if (typeof filterFn !== "function") {
        // Default to finding all items
        filterFn = function () { return true; };
    }

    if (typeof transformFn !== "function") {
        // Default to returning the original items, i.e. don't transform
        transformFn = function (itm) { return itm; };
    }

    var filteredItems = $.grep(arr, filterFn);
    var transformedItems = [];
    var obj;
    var transformed;
    var idx;

    for (idx = 0; idx < filteredItems.length; idx++) {
        obj = filteredItems[idx];
        transformed = transformFn.call(null, obj);
        transformedItems.push(transformed);

        if (returnFirstItemOnly) {
            // Skip the rest
            break;
        }
    }

    return returnFirstItemOnly ? transformedItems[0] : transformedItems;
}




/**
 * Filters the items in an array, like $.grep.
 * @param {Array<any>} arr Array to be filtered.
 * @param {function} filterFn Predicate function to filter items with, should return bool.
 * @param {boolean} [returnFirstItemOnly] Optional flag specifying whether to return only the first matching item as a single object. Otherwise an array of all matching items is returns.
 * @return {[]|object}
 */
function grep(arr, filterFn, returnFirstItemOnly) {

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
}

/**
 * Iterates over an array, executing a function for each item.
 * @param {ArrayLike} arr Array of objects to perform an action on.
 * @param {Function} eachFn The function to execute on each item.
 */
function forEach(arr, eachFn) {

    if (arr == null) {
        return;
    }

    if (typeof eachFn !== "function") {
        throw new Error("forEach, eachFn param must be a function");
    }

    for (var idx = 0; idx < arr.length; idx++) {
        eachFn.call(null, idx, arr[idx]);
    }
}

/**
 * FindTsdgVisitWorkflowStatusById : Finds the TsdgVisitWorkflowStatus with the specified ID.
 * allVisitWorkflowStatuses : Array of all TsdgVisitWorkflowStatus items.
 * workflowStatusId: ID to search for.
 */
function FindTsdgVisitWorkflowStatusById(allVisitWorkflowStatuses, workflowStatusId) {

    var workflowStatus = grepTransform(
        allVisitWorkflowStatuses,
        function filter(itm) { return itm.TsdgVisitWorkflowStatus_ID == workflowStatusId; },
        null, // no transform
        true);

    return workflowStatus;
}

/**
 * FindTsdgVisitWorkflowStatusNameById : Finds the TsdgVisitWorkflowStatus with the specified ID, and returns its name.
 * allVisitWorkflowStatuses : Array of all TsdgVisitWorkflowStatus items.
 * workflowStatusId: ID to search for.
 */
function FindTsdgVisitWorkflowStatusNameById(allVisitWorkflowStatuses, workflowStatusId) {

    var workflowStatusName = grepTransform(
        allVisitWorkflowStatuses,
        function filter(itm) { return itm.TsdgVisitWorkflowStatus_ID == workflowStatusId; },
        function transform(itm) { return itm.TsdgVisitWorkflowStatus_Name; },
        true);

    return workflowStatusName;
}

/**
 * FindNextTsdgVisitWorkflowStatus : Finds the next TsdgVisitWorkflowStatus by ordinal for specified current TsdgVisitWorkflowStatus id.
 * allVisitWorkflowStatuses : Array of all TsdgVisitWorkflowStatus items.
 * currentWorkflowStatusId: status ID to start from.
 */
function FindNextTsdgVisitWorkflowStatus(allVisitWorkflowStatuses, currentWorkflowStatusId) {

    var next;

    if (currentWorkflowStatusId == TsdgVisitWorkflowStatus.ReadyForQc) {
        next = grepTransform(
            allVisitWorkflowStatuses,
            function filter(itm) { return itm.TsdgVisitWorkflowStatus_ID == TsdgVisitWorkflowStatus.ReadyForAdmin; },
            null,
            true);

        return next;
    }

    if (currentWorkflowStatusId == TsdgVisitWorkflowStatus.RequiresReview) {
        next = grepTransform(
            allVisitWorkflowStatuses,
            function filter(itm) { return itm.TsdgVisitWorkflowStatus_ID == TsdgVisitWorkflowStatus.ReadyForQc; },
            null,
            true);

        return next;
    }

    var currentOrdinal = grepTransform(
        allVisitWorkflowStatuses,
        function filter(itm) { return itm.TsdgVisitWorkflowStatus_ID == currentWorkflowStatusId; },
        function transform(itm) { return itm.TsdgVisitWorkflowStatus_Ordinal; },
        true);

    var nextWorkflowStatus = grepTransform(
        allVisitWorkflowStatuses,
        function filter(itm) { return itm.TsdgVisitWorkflowStatus_Ordinal == currentOrdinal + 1; },
        null,
        true);

    if (!nextWorkflowStatus) {
        // Next status not found, so wrap back round to zero
        nextWorkflowStatus = grepTransform(
            allVisitWorkflowStatuses,
            function filter(itm) { return itm.TsdgVisitWorkflowStatus_Ordinal == 0; },
            null,
            true);
    }

    return nextWorkflowStatus;
}

/**
 * FindPrevTsdgVisitWorkflowStatus : Finds the previous TsdgVisitWorkflowStatus by ordinal for specified current TsdgVisitWorkflowStatus id.
 * allVisitWorkflowStatuses : Array of all TsdgVisitWorkflowStatus items.
 * currentWorkflowStatusId: status ID to start from.
 */
function FindPrevTsdgVisitWorkflowStatus(allVisitWorkflowStatuses, currentWorkflowStatusId) {

    if (currentWorkflowStatusId == TsdgVisitWorkflowStatus.ReadyForQc) {
        var prev = grepTransform(allVisitWorkflowStatuses,
            function filter(itm) { return itm.TsdgVisitWorkflowStatus_ID == TsdgVisitWorkflowStatus.RequiresReview; },
            null,
            true);

        return prev;
    }

    return null;
}

/**
 * Determines if the current browser supports input[type=date]
 */
function DoesBrowserSupportDateInput() {

    var i = document.createElement("input");
    i.setAttribute("type", "date");
    return i.type !== "text"; // Type will be 'text' if 'date' not supported
}

/**
 * Determines 2 arrays contain the same items.
 * @param {[]} arr1 First array.
 * @param {[]} arr2 Second array.
 */
function DoArraysMatch(arr1, arr2) {

    // If either array is a falsy value, return
    if (!arr1 || !arr2) {
        return false;
    }

    // Compare lengths - can save a lot of time 
    if (arr1.length != arr2.length) {
        return false;
    }

    for (var i = 0, l = arr1.length; i < l; i++) {
        // Check for nested arrays
        if (arr1[i] instanceof Array && arr2[i] instanceof Array) {
            // Recurse into nested arrays
            if (!DoArraysMatch(arr1[i], arr2[i])) {
                return false;
            }
        }
        else if (arr1[i] != arr2[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }

    return true;
}

/**
 * Formats the given label's text using the its data-format attribute value.
 * @param {any} label The label whose text is to be formatted.
 * @param {any} value The that value to be formatted.
 */
function FormatLabelText(label, value) {

    var strText = value;
    var format = label.data("format");

    if (!stringIsNullOrEmpty(format)) {

        switch (format) {

            case "yesno":
                strText = stringEquals(strText, "true") ? "Yes" : "No";
                break;

            case "datetime":
                strText = FormatDate(strText, "dd MMM yyyy HH:mm");
                break;

            case "longdatetime":
                strText = FormatDate(strText, "dd MMM yyyy HH:mm:ss");
                break;

            case "date":
                strText = FormatDate(strText, "dd MMM yyyy");
                break;

            case "time":
                strText = FormatDate(strText, "HH:mm");
                break;

            case "c":
                strText = FormatCurrency(value);
                break;

            case "c0":
                strText = FormatCurrency(value, 0);
                break;

            default:
                console.error("Unexpected format '" + format + "'");
                break;
        }
    }

    return strText;
}

/**
 * Logs the user out and sends them to the login screen.
 */
function Logout() {

    sessionStorage.removeItem("login-username");
    sessionStorage.removeItem("login-password");

    // Clear credentials.Token from localStorage. Keep the username so we can use it for a simple authentication comparison during offline login.
    var credentials = Credentials_Get();

    if (credentials != null) {
        delete credentials.Token;
        Credentials_Set(credentials.Username, null, credentials.JobTypeId, credentials.ConsuId);
    }

    window.location.href = LoginPageURL;
}

function IsDate(str, format) {

    if (stringIsNullOrEmpty(str)) {
        return false;
    }

    var parts = str.split("/", 3);
    var dt1;
    var dt2 = FormatDate(str, format);

    if (format == "dd/MM/yyyy") {
        dt1 = new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
    }
    else {
        alert("Unexpected format: " + format);
        return false;
    }

    dt1 = FormatDate(dt1, format);

    return dt1 === dt2;
}

/**
Determines if the given value can be converted to an integer number.
@param {object} inputValue The value to test.
@returns {boolean} the result of the test, true indicates the input value can be converted.
*/
function IsInt(inputValue) {

    var parsed = parseInt(inputValue, 10);

    return !isNaN(parsed);
}

/**
Determines if the given value can be converted to an integer number.
@param {object} inputValue The value to test.
@returns {boolean} the result of the test, true indicates the input value can be converted.
*/
function IsAsafeInteger(inputValue) {

    return typeof inputValue === 'number' && isFinite(inputValue) && Math.floor(inputValue) === inputValue;
}

/**
Determines if the given value can be converted to a floating point number.
@param {object} inputValue The value to test.
@returns {boolean} the result of the test, true indicates the input value can be converted.
*/
function IsFloat(inputValue) {

    var result = parseFloat(inputValue);

    return !isNaN(result);
}

/**
  * IsDateObject Determines if the given object is a JavaScript Date.
  * @param {any} obj The object to test.
  * @returns {Boolean} A value indicating if the object is a JavaScript Date.
 */
function IsDateObject(obj) {

    return Object.prototype.toString.call(obj) === '[object Date]';
}

/**
 * Determines if the given value is a formula.
 * @param {any} obj The value to test.
 */
function IsFormula(obj) {

    if (stringLeft(obj, 1) === "=") {
        return true;
    }

    return false;
}

/**
 * Stores possible formulas of editable cells in the cell tag.
 * @param {GC.Spread.Sheets.Worksheet} worksheet
 * @param {number} startRowIdx Zero-based start row of the range of cells to store.
 * @param {number} startColIdx Zero-based start column of the range of cells to store.
 * @param {number} endRowIdx Zero-based end row of the range of cells to store.
 * @param {number} endColIdx Zero-based end column of the range of cells to store.
 */
function StoreFormulasInTags(worksheet, startRowIdx, startColIdx, endRowIdx, endColIdx) {

    var rowIdx, colIdx;

    for (rowIdx = startRowIdx; rowIdx <= endRowIdx; rowIdx++) {

        for (colIdx = startColIdx; colIdx <= endColIdx; colIdx++) {

            if (IsCellEditable(worksheet, rowIdx, colIdx)) {
                StoreFormulaInTag(worksheet, rowIdx, colIdx);
            }
        }
    }
}

/**
 * Stores a cell's formula in the cell's Tag.formula.
 * @param {GC.Spread.Sheets.Worksheet} worksheet The worksheet containin the cell.
 * @param {number} rowIdx Zero-based row index of the cell.
 * @param {number} colIdx Zero-based column index of the cell.
 */
function StoreFormulaInTag(worksheet, rowIdx, colIdx) {

    var formula = worksheet.getFormula(rowIdx, colIdx);

    if (!stringIsNullOrEmpty(formula)) {

        var tag = worksheet.getTag(rowIdx, colIdx) || {};

        tag.formula = formula;

        worksheet.setTag(rowIdx, colIdx, tag);
    }
}

/**
 * Gets the value of a property stored in a cell's Tag object.
 * @param {GC.Spread.Sheets.Worksheet} worksheet The worksheet containin the cell.
 * @param {number} rowIdx Zero-based row index of the cell.
 * @param {number} colIdx Zero-based column index of the cell.
 * @param {string} propertyName Name of the property in the Tag object.
 * @returns Returns the value of the property, or undefined if the Tag is empty or property doesn't exist.
 */
function GetTagProperty(worksheet, rowIdx, colIdx, propertyName) {

    var tag = worksheet.getTag(rowIdx, colIdx) || {};

    return tag[propertyName];
}

/**
  * Returns the name of the BudgetType with the specified ID.
  * @param {number} budgetTypeId ID to search for.
  * @returns {string}
  */
function FindBudgetTypeNameById(budgetTypeId) {

    var name = grepTransform(
        BudgetTypes,
        function filter(bt) { return stringEquals(bt.BudgetType_ID, budgetTypeId); },
        function transform(bt) { return bt.BudgetType_Name; },
        true);

    return name;
}

/**
Removes unwanted trailing decimal place values, e.g. 2.000000004 becomes "2"
@param {decimal} decimalValue The decimal number.
@param {decimal} decimalPlaces The number of decimal places.
@returns {decimal}
*/
function PreciseNumber(decimalValue) {

    if (isNaN(decimalValue)) {
        return NaN;
    }

    decimalValue = decimalValue.toPrecision(10); // Remove unwanted trailing decimal place values, e.g. 2.000000004 becomes "2"
    decimalValue = Number(decimalValue); // Convert string back to number

    return decimalValue;
}

/**
Converts a decimal number by reducing the number of decimal places, e.g. convert 1.279 to 1.27
@param {decimal} decimalValue The decimal number.
@param {decimal} decimalPlaces The number of decimal places.
@returns {decimal}
*/
function RoundDown(decimalValue, decimalPlaces) {

    if (isNaN(decimalValue)) {
        return NaN;
    }
    var s = decimalValue.toFixed(decimalPlaces + 1);
    var dpIdx = s.indexOf(".");

    if (dpIdx > -1) {
        s = s.substr(0, dpIdx + decimalPlaces + 1);
    }

    decimalValue = Number(s);
    return decimalValue;
}

/**
Returns the name and address of a customer on a single line.
@param {boolean} includePostCode When true the customer's post/zip code will be included.
@param {number} maxColumns The maximum details to include.
@param {object} customer The customer object containing the fields and address data
@returns {string}
*/
function GetCombinedCustomerDetails(customer, maxColumns, includePostCode) {

    var combined = "";
    var data;

    if (!maxColumns || !customer || !customer.Customer_Name) {
        return "? Customer is not loaded";
    }

    for (var c = 1; c <= maxColumns; c++) {
        switch (c) {
            case 1:
                data = customer.Customer_Name;
                break;
            case 2:
                data = customer.Customer_Address1;
                break;
            case 3:
                data = customer.Customer_Address2;
                break;
            case 4:
                data = customer.Customer_Address3;
                break;
            case 5:
                data = customer.Customer_Address4;
                break;
            default:
                break;
        }

        if (!stringIsNullOrEmpty(data)) {
            combined = stringIsNullOrEmpty(combined) ? data.toString().trim() : combined + " " + data.toString().trim();
        }
    }

    if (includePostCode && !stringIsNullOrEmpty(customer.Customer_PostCode)) {
        combined = stringIsNullOrEmpty(combined) ? customer.Customer_PostCode.toString().trim() : combined + " " + customer.Customer_PostCode.toString().trim();
    }

    return combined;
}

/**
 * Builds a Not Implemented error that can be thrown.
 * @param {string} whatIsnt Name of the member that hasn't been implemented.
 * @param {string} message Error message.
 */
function NotImplError(whatIsnt, message) {

    this.name = "NotImplError";
    //this.message = message || "";
    this.message = whatIsnt + (message ? ". " + message : " is not implemented");
    var error = new Error(this.message);
    error.name = this.name;
    this.stack = error.stack;
}
NotImplError.prototype = Object.create(Error.prototype);

/**
  * Determines if a number falls within a range (inclusive).
  * @param {number} num: The number to check is within range.
  * @param {number} from: The minimum value.
  * @param {number} to: The maximum value.
  * @returns {boolean}
 */
function IsBetween(num, from, to) {

    if (isNaN(num) || isNaN(from) || isNaN(to)) {
        throw new Error("IsBetween: all values must be numeric");
    }

    if (from > to) {
        throw new Error("IsBetween: 'from' param must be less than or equal to 'to' param");
    }

    return (num >= from) && (num <= to);
}

/**
  * Sorts an array by the supplied column values. Works with a single column only.
  * @param {Array} array The array which is to be sorted.
  * @param {string} key The name of the column which will be used for sorting on.
  * @returns {Array} The sorted array.
 */
function SortArrayBy(array, key) {

    return array.sort(function (a, b) { return (a[key] > b[key]) ? 1 : ((b[key] > a[key]) ? -1 : 0); });
}

/**
  * Sets a cell's formula to a custom named formula that was created via Workbook.addCustomName.
  * @param {GC.Spread.Sheets.Worksheet} sheet A sheet (tab) containing the cell whose formula is to be set.
  * @param {number} rowIdx The zero-based row index of the cell whose formula is to be set.
  * @param {number} colIdx The zero-based column index of the cell whose formula is to be set.
  * @param {string} formulaCustomName The name of the formula's customName (GC.Spread.Sheets.NameInfo).
  * @returns {void}
 */
function SetFormulaByCustomName(sheet, rowIdx, colIdx, formulaCustomName) {

    var workbook = sheet.parent;
    var custName = workbook.getCustomName(formulaCustomName);
    var expr = custName.getExpression();
    var formula = GC.Spread.Sheets.CalcEngine.expressionToFormula(workbook, expr);

    sheet.setFormula(rowIdx, colIdx, formula);
}

/**
  * Determines if the date parts (excluding time) of 2 dates are equal.
  * @param {string|Date} date1 First date to compare. Can be a JS Date or a string in yyyy-MM-dd format.
  * @param {string|Date} date2 Second date to compare. Can be a JS Date or a string in yyyy-MM-dd format.
  * @returns {Boolean} A value indicating if the 2 dates are equal.
 */
function AreDatesEqual(date1, date2) {

    if (date1 == null || date2 == null) {
        return false;
    }

    if (isString(date1)) {
        date1 = stringLeft(date1, 10); // Get yyyy-MM-dd from start of string
    }

    date1 = RemoveTime(date1);

    if (isString(date2)) {
        date2 = stringLeft(date2, 10); // Get yyyy-MM-dd from start of string
    }

    date2 = RemoveTime(date2);

    return stringEquals(date1.toDateString(), date2.toDateString());
}

/**
Returns the textual description of the land measurement setting.
@param {boolean} plural When true the returned message will be made plural.
@returns {string}
*/
function GetSingularLandMeasurement(plural) {

    var measurement = "";

    switch (window.localStorage.LandMeasure) {
        case "Hectares":
            measurement = "Hertare";
            break;
        case "Acres":
            measurement = "Acre";
            break;
        default:
            break;
    }

    if (plural) {
        measurement = measurement + "s";
    }

    return measurement;
}

/**
Displays or hides the busy spinner which locks out the user interface.
@param {boolean} show When true the busy spinner will be shown, when false the busy spinner will be hidden.
@returns {void}
*/
function BusySpinner(show) {

    if (show) {
        $("#busySpinner").show();
    }
    else {
        $("#busySpinner").hide();
    }
}

///**
//Creates a modal popup message used by the synchronisation process.
//@param {string} message The text to display.
//@param {object} options Options for the display.
//@returns {void}
//*/
//var BusyMessage = BusyMessage || (function ($) {

//    var $dialog = $(
//        '<div class="modal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true" style="padding-top:15%; overflow-y:visible;">' +
//        '<div class="modal-dialog modal-m">' +
//        '<div class="modal-content">' +
//        '<div class="modal-header"><h3 style="margin:0;"></h3></div>' +
//        '<div class="modal-body">' +
//        '<div class="progress progress-striped active" style="margin-bottom:0;"><div class="progress-bar" style="width: 100%"></div></div>' +
//        '</div>' +
//        '</div></div></div>');

//    return {
//        show: function (message, options) {
//            var settings = $.extend({
//                dialogSize: 'm',
//                progressType: ''
//            }, options);
//            $dialog.find('.modal-dialog').attr('class', 'modal-dialog').addClass('modal-' + settings.dialogSize);
//            $dialog.find('.progress-bar').attr('class', 'progress-bar');
//            if (settings.progressType) {
//                $dialog.find('.progress-bar').addClass('progress-bar-' + settings.progressType);
//            }
//            $dialog.find('h3').text(message);
//            $dialog.modal();
//        },
//        hide: function () {
//            $dialog.modal('hide');
//        }
//    };
//})(jQuery);

/**
 * Adds the given amount of time to a provided date object. Day, week, month, and year increments maintain the same hour for changes that pass through daylight saving time.
 * @name dateAdd
 * @param {Date} original The date object
 * @param {number} increment The amount of time to add (or subtract if negative)
 * @param {string} [unit] (optional) The time unit to use. Defaults to milliseconds
 * @returns {Date} An updated date object
 * @example
 *
 * var originalDate = new Date('July 1, 2016 18:45:10');
 * 
 * dateAdd(originalDate, 6000, 'milliseconds');  // => 'July 1, 2016 18:45:16'
 * dateAdd(originalDate, 5, 'seconds');          // => 'July 1, 2016 18:45:15'
 * dateAdd(originalDate, 5, 'minutes');          // => 'July 1, 2016 18:45:10'
 * dateAdd(originalDate, 5, 'hours');            // => 'July 1, 2016 23:45:10'
 * dateAdd(originalDate, 5, 'days');             // => 'July 6, 2016 18:45:10'
 * dateAdd(originalDate, 2, 'weeks');            // => 'July 15, 2016 18:45:10'
 * dateAdd(originalDate, 2, 'months');           // => 'September 1, 2016 18:45:10'
 * dateAdd(originalDate, 5, 'years');            // => 'July 1, 2021 18:45:10'
 * dateAdd(originalDate, -1, 'days');            // => 'June 30, 2016 18:45:16'
 * dateAdd(originalDate, 6000);                  // => 'July 1, 2016 18:45:16' - Defaults to ms
 */
function dateAdd(original, increment, unit) {

    var newDate;
    // Return undefined if first argument isn't a Date object
    if (!(original instanceof Date)) {
        console.error("dateAdd - %s is not a Date object", original);
        return (undefined);
    }

    switch (unit) {
        case 'second':
        case 'seconds':
            // Add number of seconds to current date (ms*1000)
            newDate = new Date(original);
            newDate.setTime(original.getTime() + (increment * 1000));
            return newDate;

        case 'minute':
        case 'minutes':
            // Add number of minutes to current date (ms*1000*60)
            newDate = new Date(original);
            newDate.setTime(original.getTime() + (increment * 1000 * 60));
            return newDate;

        case 'hour':
        case 'hours':
            // Add number of hours to current date (ms*1000*60*60)
            newDate = new Date(original);
            newDate.setTime(original.getTime() + (increment * 1000 * 60 * 60));
            return newDate;

        case 'day':
        case 'days':
            // Add number of days to current date
            newDate = new Date(original);
            newDate.setDate(original.getDate() + increment);
            return newDate;

        case 'week':
        case 'weeks':
            // Add number of weeks to current date
            newDate = new Date(original);
            newDate.setDate(original.getDate() + (increment * 7));
            return newDate;

        case 'month':
        case 'months':
            // Get current date
            var oldDate = original.getDate();

            // Increment months (handles year rollover)
            newDate = new Date(original);
            newDate.setMonth(original.getMonth() + increment);

            // If new day and old day aren't equal, set new day to last day of last month
            // (handles edge case when adding month to Jan 31st for example. Now goes to Feb 28th)
            if (newDate.getDate() != oldDate) {
                newDate.setDate(0);
            }

            // Handle leap years
            // If old date was Feb 29 (leap year) and new year isn't leap year, set new date to Feb 28
            if (original.getDate() == 29 && !isLeapYear(newDate.getFullYear())) {
                newDate.setMonth(1);
                newDate.setDate(28);
            }

            return newDate;

        case 'year':
        case 'years':
            // Increment years
            newDate = new Date(original);
            newDate.setFullYear(original.getFullYear() + increment);

            // Handle leap years
            // If old date was Feb 29 (leap year) and new year isn't leap year, set new date to Feb 28
            if (original.getDate() == 29 && !isLeapYear(newDate.getFullYear())) {
                newDate.setMonth(1);
                newDate.setDate(28);
            }

            return newDate;

        // Defaults to milliseconds
        default:
            newDate = new Date(original);
            newDate.setTime(original.getTime() + increment);
            return newDate;
    }
}

/**
 * Determines if the given year number is a leap year.
 * @param {any} year The year number, e.g. 2016.
 * @returns {Boolean} Returns a true/false value indicating if year is a leap year.
 */
function isLeapYear(year) {

    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

/**
 * Gets the year start date based on a given year end date, i.e. 1 year before, plus 1 day. So, if year end date is 31 Mar 2017, the result will be 1 April 2016.
 * @param {Date} yearEndDate
 * @returns {Date} Returns a new date representing the year start date.
 */
function GetYearStartDate(yearEndDate) {

    var ysDate = dateAdd(yearEndDate, -1, "year");
    ysDate = dateAdd(ysDate, 1, "day");

    return ysDate;
}

/**
 * Takes a JavaScript Date, or string in YYYY-MM-DD format that will convert directly to JavaScript Date, and removes any time-of-day component.
 * @param {Date|string} date The JavaScript Date object or string to remove the time from.
 8 @returns {Date} Returns a JavaScript Date without a time component.
 */
function RemoveTime(date) {

    if (isString(date)) {
        // Chop off time element
        var timeIdx = date.indexOf("T");

        if (timeIdx > -1) {
            date = date.substr(0, timeIdx);
        }

        // Convert YYYY-MM-DD format to YYYY/MM/DD, which JS will parse independent of user local settings
        if (date.indexOf("-")) {
            //date = date.replace("-", "/");
            date = stringReplace(date, "-", "/");
        }

        date = new Date(date); // Convert string to JS Date
    }

    date.setHours(0, 0, 0, 0); // remove possible time component set from local timezone offset via 'new Date' ctor

    return date;
}

/**
 * Displays an alert message providing one has not been previously shown within the specified delay.
 * @param {string} msg The text message to display.
 * @param {number} delay The delay to expire before the next alert message should be displayed.
 * @returns {void}
 */
function ShowAlertOnce(msg, delay) {

    var dte = SystemDate.Now();

    if (dte.getTime() - ShowAlertOnce_LastShown > 0) {
        alert(msg);
        dte = SystemDate.Now();
        ShowAlertOnce_LastShown = dte.getTime() + delay;
    }
}


/**
* Sets, returns or clears an array list of customer id's for identifying which have recently been associated with the current user. Used to know when a sync is required before a customer is selected.
* @param {string} id The customer id which is a guid value.  If empty then the function will return data, or if 'clear' will delete the data.
* @returns {array} of the customer id's or true if data was cleared or added.
*/
function RecentlyAddedCustomers(id) {

    if (stringIsNullOrEmpty(id)) {
        return JSON.parse(window.localStorage.getItem("RecentlyAddedCustomers"));
    }
    else {
        if (id !== "clear") {
            var customerArray = JSON.parse(window.localStorage.getItem("RecentlyAddedCustomers"));
            if (!customerArray) {
                customerArray = [];
            }
            customerArray.push(id);
            localStorage.setItem("RecentlyAddedCustomers", JSON.stringify(customerArray));
        }
        else {
            localStorage.removeItem("RecentlyAddedCustomers");
        }
        return true;
    }
}

/**
 * Gets or sets the Customer Editing mode for the current user. Also sets CustomerEditingMode flag for performance reasons.
 * @param {boolean} mode Pass true if user can edit, false if they can't, or undefined to read the value.
 * @returns {boolean} Returns true if a value was passed in i.e. a value was set, else returns the current setting as a boolean.
 */
function CustomerEditing(mode) {

    var key = "Cust_Access_Type";

    if (mode === undefined) {
        // Read current setting
        return Local_Get(key);
    }
    else {
        // Store setting
        Local_Set(mode, key);
        // Also set global var that can be used for performance reasons
        CustomerEditingMode = mode;
        return true;
    }
}

/**
Sets a cell's value if the cell is editable.
@param {GC.Spread.Sheets.Worksheet} worksheet The worksheet (tab) containing the cell.
@param {int} rowIdx Cell's row index.
@param {int} colIdx Cell's column index.
@param {any} value The value to set.
@param {boolean} [setIfNaN=false] Flag specifying whether to still populate the cell if given value is NaN. If false, and value is NaN, the cell is cleared. Default is false.
@returns {void}
*/
function SetCellValue(worksheet, rowIdx, colIdx, value, setIfNaN) {

    // Only allow updating the cell if its background colour indicates it is editable
    if (IsCellEditable(worksheet, rowIdx, colIdx) /*&& (!isNaN(value) || setIfNaN === true)*/) {

        // Check if NaN and not just text
        if (!setIfNaN && isNaN(value) && !stringIsNullOrEmpty(value) && value.toString() === NaN.toString()) {
            value = null;
        }

        worksheet.setValue(rowIdx, colIdx, value);
    }
    //else if (StringIsNullOrEmpty(worksheet.getFormula(rowIdx, colIdx))) {
    //    // Log as error if cell we're trying to set is neither editable nor a formula
    //    console.error("SetCellValue - cell not editable: '" + worksheet.name() + "'!" + CellIdxToA1(rowIdx, colIdx));
    //}
}

/**
 * Determines if a cell is editable, based on its background colour.
 * @param {GC.Spread.Sheets.Worksheet} worksheet The worksheet (tab) containing the cell.
 * @param {number} rowIdx The cell's row index.
 * @param {number} colIdx The cell's column index.
 * @returns {boolean} Returns a value indicating if the cell is editable.
 */
function IsCellEditable(worksheet, rowIdx, colIdx) {

    var cell = worksheet.getCell(rowIdx, colIdx);

    return IsCellRangeEditable(cell);
}

/**
 * Checks if a worksheet cell is editable based on its background colour.
 * @param {GC.Spread.Sheets.CellRange} cell The cell to test.
 * @returns {boolean} Returns a value indicating if the cell is editable.
 */
function IsCellRangeEditable(cell) {

    var bgColour = cell.backColor();

    return stringEquals(bgColour, editableCellBgColour) || stringEquals(bgColour, editableCellBgColourRgb) || stringEquals(bgColour, editableBudgetBgColour) || stringEquals(bgColour, editedBudgetBgColour);
}

/**
 * Locks/unlocks a worksheet's cells depending if the cell is editable and if the user has permission to edit.
 * @param {GC.Spread.Sheets.Worksheet} worksheet The worksheet (tab) to lock/unlock.
 * @param {boolean} userCanEdit Flag indicating if user has permission to edit.
 * @returns {void}
 */
function LockWorksheet(worksheet, userCanEdit) {

    var colIdx, rowIdx;
    var colCount = Math.min(worksheet.getColumnCount(), 40);
    var rowCount = worksheet.getRowCount();
    var cell;
    var isCellEditable = false;

    for (rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        for (colIdx = 0; colIdx < colCount; colIdx++) {

            cell = worksheet.getCell(rowIdx, colIdx);
            isCellEditable = IsCellRangeEditable(cell);

            if (userCanEdit === false || !isCellEditable) {
                if (cell.locked() === false) {
                    cell.locked(true);
                    //console.log("locked " + worksheet.name() + "!" + CellIdxToA1(rowIdx, colIdx));
                }
            }
            else if (cell.locked() === true && isCellEditable) {
                cell.locked(false);
                //console.log("unlocked " + worksheet.name() + "!" + CellIdxToA1(rowIdx, colIdx));
            }
        }
    }

    // Need to protect sheet for '.locked' to take effect
    worksheet.options.isProtected = true;
}

/**
Clears the value of all editable cells in the given worksheet.
@param {GC.Spread.Sheets.Worksheet} worksheet The worksheet (tab) in which to clear cells.
@param {number} startColIdx The first column index to clear.
@param {number} endColIdx The last column index to clear.
@param {number} startRowIdx The first row index to clear.
@param {number} endRowIdx The last row index to clear.
@param {boolean} clearAll when true will clear all cells within the range.
@returns {void}
*/
function ClearEditableCells(worksheet, startColIdx, endColIdx, startRowIdx, endRowIdx, clearAll) {

    var colIdx;
    var rowIdx;

    for (colIdx = startColIdx; colIdx <= endColIdx; colIdx++) {
        for (rowIdx = startRowIdx; rowIdx <= endRowIdx; rowIdx++) {
            if (clearAll || IsCellEditable(worksheet, rowIdx, colIdx)) {
                worksheet.setValue(rowIdx, colIdx, ""); // Clear value
            }
        }
    }
}

/**
Get or set the status indicating if a synchronise is required due to modified data existing in the IndexedDb database. Adds or removes a blinking class.
@param {boolean} isDirty Optional if supplied then a Set will be performed, else a Get is performed.
@returns {boolean} indicating the success of the Set operation or true when a sync is required for the Get operation.
*/
function CheckHaveUnSentData(isDirty) {

    if (isDirty !== undefined) {
        Local_Set((isDirty), "IsModifiedData");
        if (isDirty) {
            $("#settings-dropdown").addClass("blink_me_slow");
            $("#SyncLink").addClass("blink_me_fast");
        }
        else {
            $("#settings-dropdown").removeClass("blink_me_slow");
            $("#SyncLink").removeClass("blink_me_fast");
        }
        return true;
    }
    else {
        return Local_Get("IsModifiedData");
    }
}

/**
Deletes rows in the given worksheet.
@param {GC.Spread.Sheets.Worksheet} worksheet The worksheet (tab) in which to delete rows.
@param {number} startRowIdx The first row index to clear.
@param {number} endRowIdx The last row index to clear.
@returns {void}
*/
function DeleteWorksheetRows(worksheet, startRowIdx, endRowIdx) {

    for (var i = startRowIdx; i <= endRowIdx; i++) {
        worksheet.deleteRows(i, endRowIdx - startRowIdx);
    }
}

/**
Prevents a numerical value being entered into a HTML input control which are too large based on length rather than value. For use where min and max properties are not working.
@param {<input>} input Reference to the HTML <input> control.
@param {number} maxLength Maximum number of digits allowed.
@returns {void}
*/
function ValidateCustomerNumericalInput(input, maxLength) {
    try {
        if (!input || input.length === 0) {
            return;
        }
        else {
            if (input.value.length > maxLength) {
                input.value = input.value.substring(0, maxLength);
            }
        }
    }
    catch (e) {
        console.warn(e);
    }
}

/**
 * Retrieves version info and stores in localStorage.
 * @returns {void}
 */
function FTApp_GetVersion() {

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
 * Removes any text surrounded in a bracket. Also removes the brackets.
 * @returns {string}
 */
function StripMeasurement(value) {

    var startIdx = value.toString().indexOf("(");

    if (startIdx >= 0) {
        var endIdx = value.toString().indexOf(")");

        if (endIdx >= 0) {
            value = value.substring(0, startIdx).trim() + value.substring(endIdx + 1).trim();
        }
    }

    return value;
}

/**
 * Gets the A1-style cell reference from a single-cell formula.
 * @param {string} formula the formula, e.g. "'Commercial GM'!A6"
 * @returns {string} Returns the cell reference, e.g. 'A6'
 */
function ExtractCellRefFromFormula(formula) {

    // Remove sheet prefix
    formula = formula.replace(/'[\s\w]+'!/gi, "");

    // Remove unnecessary $ symbols
    return formula.replace(/\$/g, "");
}

/**
 * Determines if an object has any non-empty properties.
 * @param {any} obj The object to test.
 */
function DoesObjectHaveValues(obj) {

    if (obj == null || typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
        // null or primitive types are considered to not have property values
        return false;
    }

    var values = Object.values(obj); // For an object { foo: "test", bar: 2 }, returns array ["test", 2]
    var value;

    for (var idx = 0; idx < values.length; idx++) {

        value = values[idx];

        if (value != null && String(value).length > 0) {
            // Object has values
            return true;
        }
    }

    // Object does not have values
    return false;
}

/**
 * Merges the contents of two or more objects together into the first object. like jQuery $.extend().
 * @param {any} target
 * @param {any} source
 */
function extend(target, source) {

    target = target || {};

    for (var prop in source) {
        if (typeof source[prop] === 'object') {
            target[prop] = extend(target[prop], source[prop]);
        } else {
            target[prop] = source[prop];
        }
    }

    return target;
}
