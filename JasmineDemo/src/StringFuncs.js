
/**
  * Determines if 2 strings are equal.
  * @param {string} str1 The first string.
  * @param {string} str2 The second string.
  * @param {boolean} [cs] Optional flag indicating whether or not to do a case-sensitive comparison. Default is false (case-insensitive).
  * @param {boolean} [nullEqualsEmpty] Optional flag indicating whether or not to consider null and zero-length strings to be equal. Default is false (not equal).
  * @returns {boolean} True/false indicating if equal or not.
 */
function stringEquals(str1, str2, cs, nullEqualsEmpty) {

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
}

/**
 * Chops the last character off the given string.
 * @param {any} str The string to chop off the last character.
 * @returns A string minus the last character.
 */
function stringChopLastChar(str) {

    if (str == null || str === undefined || str.length === 0) {
        return str;
    }

    str = "" + str; // Ensure string
    str = str.substring(0, str.length - 1);

    return str;
}

/**
 * Determines if a string with all whitespace removed is equal to another string.
 * @param {any} str1 The first string.
 * @param {any} str2 The second string.
 * @param {any} cs Flag specifying if case-sensitive comparison should be performed. Default is false, i.e. NOT case-sensitive.
 * @returns {string} A value indicating if the 2 strings are equal.
 */
function stringSansWhitespaceEquals(str1, str2, cs) {

    str1 = stringRemoveWhitespace(str1);
    //var str1 = "Opening 	 valuation in\n\rstore"
    return stringEquals(str1, str2, cs);
}

/**
 * Removes any kind of whitespace from a string.
 * @param {any} str1 The string to remove whitespace from.
 * @returns A new string with whitespace removed.
 */
function stringRemoveWhitespace(str1) {

    if (str1 == null) {
        return str1;
    }

    str1 = (str1 + "").replace(/[\s\n\r\t]/g, '');

    return str1;
}

/**
 * Retrieves the value of the string if not null or empty, or the specified default value.
 * @param {string} str the string to check.
 * @param {string} defaultValue the default value to return if @str is null or empty.
 * @returns {string}
 */
function stringGetValueOrDefault(str, defaultValue) {

    return stringIsNullOrEmpty(str) ? defaultValue : str;
}

/**
 * Determines if the first string contains the second string.
 * @param {string} str1 the string to search within
 * @param {string} str2 the string to search for
 * @param {boolean} cs case-sensitive search. Defaults to false if not specified
 */
function stringContains(str1, str2, cs) {

    if (str1 == null && str2 == null)
        return true;

    if (str1 == null || str2 == null)
        return false;

    // Case-sensitive comparison
    if (cs === true) {
        return str1.toString().indexOf(str2.toString()) > -1;
    }

    // Case-insensitive comparison
    return str1.toString().toLowerCase().indexOf(str2.toString().toLowerCase()) > -1;
}

/**
 * Determines if a string contains a whole word.
 * @param {string} str the string to search within 'Test income'
 * @param {string} word the word to search for, e.g. 'income' would return true, 'incom' would return false.
 * @param {boolean} cs case-sensitive search. Defaults to false (case-insensitive) if not specified.
 */
function stringContainsWord(str, word, cs) {

    str = str + ""; // Ensure it's a string

    if (cs === undefined) {
        cs = false; // Default to case-insensitive
    }

    var flags = "g";

    if (!cs) {
        flags += "i";
    }

    var contains = new RegExp("\\b" + word + "\\b", flags).test(str);

    return contains;
}

/**
 * Determines if a string contains any of the strings in the array.
 * @param {string} str The string to search in.
 * @param {Array<string>} arr Array of strings to search for in str.
 * @param {boolean} [cs] Flag to indicate if a case-sensitive search is required. Defaults to false (case-insensitive) if not specified.
 */
function stringContainsAny(str, arr, cs) {

    if (!$.isArray(arr) || arr.length === 0) {
        throw new Error("StringContainsAny, arr param must be a non-empty array");
    }

    for (var idx = 0; idx < arr.length; idx++) {

        if (stringContains(str, arr[idx], cs)) {
            return true;
        }
    }

    return false;
}

/**
 * Determines if a string array contains a particular string.
 * @param {Array<string>} arr Array of strings to search in.
 * @param {string} str The string to search for.
 * @param {boolean} cs Case-sensitive search. Defaults to false (case-insensitive) if not specified.
 */
function stringArrayContains(arr, str, cs) {

    if (arr != null) {
        for (var idx = 0; idx < arr.length; idx++) {
            if (stringEquals(arr[idx], str, cs)) {
                return true;
            }
        }
    }

    return false;
}

function stringReplaceLineBreaks(str, replacement) {

    if (str === null || str === undefined || str.length === 0) {
        return str;
    }

    if (replacement == null) {
        replacement = "";
    }

    str = str.replace(/\r\n/, replacement);

    return str;
}

/**
 * Replaces all occurrences of a string within a string.
 * @param {string} str The string to search and replace in.
 * @param {string} replaceWhat The string to search for and replace.
 * @param {string} replacement The string to replace with.
 * @param {boolean} cs Case-sensitive flag. Defaults to false if not provided.
 * @returns {string} Returns the string with matching occurrences replaced.
 */
function stringReplace(str, replaceWhat, replacement, cs) {

    str = str + ""; // Ensure it's a string

    if (cs === undefined) {
        cs = false; // Default to case-insensitive
    }

    var flags = "g";

    if (!cs) {
        flags += "i";
    }

    var rx = new RegExp(RegExpEsc(replaceWhat), flags);

    str = str.replace(rx, replacement);

    return str;
}


/**
 * Splits a string at capital letters, e.g. 'FooBarBAZ' returns 'Foo Bar BAZ'
 * @param {string} str The string to split.
 * @param {string} [separator] Optional Separator character or string. Default is single space char.
 * @param {boolean} splitOnConsecutiveCaps Flag to indicate if consecutive capital letters should also be split. Default is false.
 * @returns {string} Returns a string.
 */
function stringSplitCaps(str, separator, splitOnConsecutiveCaps) {

    if (str === null || str === undefined || str.length === 0) {
        return str;
    }

    if (separator === undefined || separator == null) {
        separator = " ";
    }

    if (splitOnConsecutiveCaps === undefined) {
        splitOnConsecutiveCaps = false;
    }

    var result = "", currChar, currCharCode, currCharIsUpper, prevUpperCharCount;

    for (var idx = 0; idx < str.length; idx++) {
        currChar = str[idx];
        currCharCode = currChar.charCodeAt(0);

        // Check for capital letters between A-Z
        currCharIsUpper = currCharCode >= 65 && currCharCode <= 90;

        if (currCharIsUpper) {
            if (prevUpperCharCount === 0 || (prevUpperCharCount > 0 && splitOnConsecutiveCaps)) {
                result += " ";
            }

            prevUpperCharCount = (prevUpperCharCount === undefined ? 1 : prevUpperCharCount + 1);
        }
        else {
            // Insert a space when the previous 2 or more chars were all upper
            if (prevUpperCharCount > 1) {
                result += " ";
            }

            prevUpperCharCount = 0;
        }

        result += currChar;
    }

    return result;
}

/**
 * Removes the specified string from the end of a string, if found.
 * @param {string} str String to be searched in and modified.
 * @param {string} end String to remove.
 */
function stringChopEnd(str, end) {

    if (str == null || str == "") {
        return str;
    }

    if (stringRight(str, end.length) === end) {
        str = stringLeft(str, str.length - end.length);
    }

    return str;
}

/**
 * Trims whitespace from the start and end of a string.
 * @param {string} str
 */
function stringTrim(str) {

    if (typeof str !== "string" || str == null || str == "") {
        return str;
    }

    return str.trim();
}


/**
 * Determines if a string is null/undefined/empty/whitespace.
 * @param {any} str The string to test.
 */
function stringIsNullOrEmpty(str) {

    if (str === undefined || str === null)
        return true;
    else if (str.toString().trim() === "")
        return true;
    else
        return false;
}

/**
 * Determines if a string starts with a particular string.
 * @param {string} str The string to search within.
 * @param {string} start The string to search for.
 * @returns {boolean}
 */
function stringStartsWith(str, start) {

    if (str == null || start == null) {
        return false;
    }

    str = str + "";
    start = start + "";

    if (str.length === 0 || start.length === 0) {
        return false;
    }

    if (str.indexOf(start) === 0) {
        return true;
    }

    return false;
}

/**
 * Determines if a string is null/undefined/empty-string/empty-guid (all zeroes).
 * @param {string} str The string to test.
 * @returns {boolean} Returns a value indicating if str is null/empty guid.
 */
function stringIsNullOrEmptyGuid(str) {

    const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

    return stringIsNullOrEmpty(str) || str == EMPTY_GUID;
}

/**
 * Gets the given number of chars starting from the left of the string.
 * @param {string} str The string to look in.
 * @param {number} length The number of chars to return.
 */
function stringLeft(str, length) {

    if (str == null) {
        return str;
    }

    str = str.toString();

    if (str.length < length) {
        return str;
    }

    return str.substring(0, length);
}

/**
 * Returns a string containing a specified number of characters from the right side of a string.
 * @param {string} str String expression from which the rightmost characters are returned.
 * @param {number} length Number indicating how many characters to return. If 0, a zero-length string ("") is returned. If greater than or equal to the number of characters in str, the entire string is returned.
 * @returns {string} Returns a string containing a specified number of characters from the right side of a string.
 */
function stringRight(str, length) {

    if (str == null) {
        str = "";
    }

    if (length == null || length < 0) {
        length = 0;
    }

    str = str + "";

    if (str.length < length) {
        return str;
    }

    return str.substr(str.length - length);
}

/**
 * Determines if the given value is a string type.
 * @param {any} obj The value to test.
 * @returns {boolean} Returns a value indicating if the value passed in is a string.
 */
function isString(obj) {

    return typeof obj === "string";
}

/**
 * Inserts values into another string containing numbered placeholders, returning a copy of the string with any placeholders replaced by the string representation of each arg value. Accepts any number of format items.
 * @param {String} str A string containing format placeholders, e.g. "Hello, {0}!"
 * @param {...any} args One or more values to insert into str.
 */
function stringFormat(str, ...args) {

    if (str == null || typeof str !== "string" || args == null || args.length < 1) {
        return str;
    }

    var rxPattern;

    for (var idx = 0; idx < args.length; idx++) {

        rxPattern = "\\{" + idx + "\\}";

        str = str.replace(new RegExp(rxPattern, "g"), args[idx]);
    }

    return str;
}
