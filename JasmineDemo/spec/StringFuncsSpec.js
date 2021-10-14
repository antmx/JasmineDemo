/// <reference path="../src/stringfuncs.js" />

jasmine.getEnv().configure({ random: false });

describe("stringFuncs", function () {

    beforeEach(function () {

    });

    describe("stringEquals", function () {

        it("should return true when both strings are equal and same case", function () {

            var result = stringEquals("foo", "foo");

            expect(result).toBe(true);
        });

        it("should return true when both strings are equal but different case and default case-insensitive comparison performed", function () {

            var result = stringEquals("foo", "Foo");

            expect(result).toBe(true);
        });

        it("should return false when both strings are equal but different case and case-sensitive comparison performed", function () {

            var result = stringEquals("foo", "Foo", true);

            expect(result).toBe(false);
        });

        it("should return false when both first string is empty and second string is null and nullEqualsEmpty param is true", function () {

            var result = stringEquals("", null, false, true);

            expect(result).toBe(true);
        });

        it("should return false when both first string is empty and second string is null and nullEqualsEmpty param is false", function () {

            var result = stringEquals("", null, false, false);

            expect(result).toBe(false);
        });
    });

    describe("stringIsNullOrEmpty", function () {

        it("should return true for null", function () {

            var result = stringIsNullOrEmpty(null);

            expect(result).toBe(true);
        });

        it("should return true for empty", function () {

            var result = stringIsNullOrEmpty("");

            expect(result).toBe(true);
        });

        it("should return true for whitespace-only", function () {

            var result = stringIsNullOrEmpty("  ");

            expect(result).toBe(true);
        });

        it("should return false for non-empty", function () {

            var result = stringIsNullOrEmpty("foo");

            expect(result).toBe(false);
        });

        it("should return false for non-empty that includes whitespace", function () {

            var result = stringIsNullOrEmpty("   foo   bar   ");

            expect(result).toBe(false);
        });
    });

    describe("stringFormat", function () {

        it("should replace a single item", function () {
            
            var result = stringFormat("Hello, {0}!", "World");

            expect(result).toEqual("Hello, World!");
        });

        it("should replace multiple items", function () {
            
            var result = stringFormat("Hello, {0} {1}!", "Joe", "Foo");

            expect(result).toEqual("Hello, Joe Foo!");
        });

        it("should replace multiple items with the same placeholder number", function () {
            
            var result = stringFormat("Hello, {0} {1}! How are you {0}?", "Joe", "Foo");

            expect(result).toEqual("Hello, Joe Foo! How are you Joe?");
        });

    });
});
