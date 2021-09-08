/// <reference path="../src/stringfuncs.js" />

describe("stringFuncs", function () {

    jasmine.getEnv().configure({ random: false });

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
});
