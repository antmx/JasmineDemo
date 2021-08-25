
describe("Misc", function () {

    describe("grep", function () {

        beforeEach(function () {

        });

        it("should return 1 item if 1 matches", function () {

            var arr = [10, 20, 30];

            var filterFn = function (num) {
                return num > 10 && num < 30;
            };

            var result = grep(arr, filterFn);

            expect(result).toEqual([20]);
        });

        it("should return empty array if no matches", function () {

            var arr = [10, 20, 30];

            var filterFn = function (num) {
                return num < 10;
            };

            expect(grep(arr, filterFn)).toEqual([]);
        });
    });


});
