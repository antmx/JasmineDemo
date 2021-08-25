
/// <reference path="services/DbQuerySvc.js" />
/// <reference path="misc.js" />
/// <reference path="../LinqAll.js" />
/// <reference path="../../_references.js" />

/**
 * @classdesc Budget Data Access Layer
 */
var ApiClient = /** @class */ (function () {

    /**
     * @constructor Initialises a new ApiClient instance
     * @param {DbQuerySvc} dbQuerySvc Instance of DbQuerySvc
     * @param {BudgetCalculator} budgetCalculator Instance of BudgetCalculator.
     * @prop {DbQuerySvc} DbQrySvc Instance of DbQuerySvc
     */
    function ApiClient(dbQuerySvc, budgetCalculator) {

        this.DbQrySvc = dbQuerySvc;
        this.BudgetCalculator = budgetCalculator;

        /**
        * FilterModified Returns the items whose ModifiedData property is 'true'
        * @param {array} arr The array of items to filter.
        * @returns An array of filtered items.
        */
        this.FilterModified = function (arr) {

            if (arr == null || Array.isArray(arr) !== true) {
                throw new Error("FilterModified: arr param must be a non-null array");
            }

            return $.grep(arr, function (itm, idx) {
                return itm.ModifiedData == true;
            });
        };
    }

    // #region Copying

    ApiClient.prototype.CopyBudgetDifferentYear = function (srcBudgetDateId, newYearEndDate, newVersionNo, newDescription/*Removed for #457, newOpeningBankBalance*/) {

        // 1 - FetchBudget
        // 2 - Adjust values, remove unwanted rows/values
        // 3 - Set remaining rows to ModifiedData = 1
        // 4 - SaveCopiedBudget

        var self = this;
        var deferred = $.Deferred();

        self.FetchBudget(srcBudgetDateId)
            .done(function (budgetObj) {

                // Adjust changeable values, remove unwanted rows/values

                var newBudgetDateId = GenerateGuid();

                budgetObj.BudgetDate.BudgetDate_Source_ID = srcBudgetDateId;
                budgetObj.BudgetDate.BudgetDate_ID = newBudgetDateId; // Assign new id
                budgetObj.BudgetDate.BudgetDate_Date = newYearEndDate;
                budgetObj.BudgetDate.BudgetDate_VersionNo = newVersionNo;
                budgetObj.BudgetDate.BudgetDate_Description = newDescription;
                budgetObj.BudgetDate.BudgetDate_WorkflowStatusId = BudgetWorkflowStatus.New;
                // Removed for #457
                //budgetObj.BudgetDate.BudgetDate_OpeningBankBalance = newOpeningBankBalance;
                budgetObj.BudgetDate.ModifiedData = true; // todo - true means "saved ready for upload", but we may need to set to false if "saved for further mods"

                // Copy applicable tables
                self.CopyCapexes(budgetObj, newBudgetDateId, false);
                self.CopyGrossMargins(budgetObj, newBudgetDateId, false);
                self.CopyDairyYoungstockCals(budgetObj, newBudgetDateId, false);
                self.CopyBeefRearingCals(budgetObj, newBudgetDateId, false);
                self.CopyBreedingEweCals(budgetObj, newBudgetDateId, false);
                self.CopyArableCropReconcils(budgetObj, newBudgetDateId, false);
                self.CopyOverheadCosts(budgetObj, newBudgetDateId, false);
                self.CopyRentSchedules(budgetObj, newBudgetDateId, false);
                self.CopyLoanSchedules(budgetObj, newBudgetDateId, false);
                self.CopyEnterpriseToCustomers(budgetObj, newBudgetDateId, false);

                self.SaveCopiedBudget(budgetObj)
                    .done(function () {
                        // Save succeeded
                        deferred.resolve(newBudgetDateId);
                    })
                    .fail(function (saveFailReasion) {
                        // Save failed
                        deferred.reject(saveFailReasion);
                    });

            })
            .fail(function (fetchFailReason) {
                // Fetch failed
                deferred.reject(fetchFailReason);
            });

        return deferred.promise();
    };

    ApiClient.prototype.CopyBudgetSameYear = function (srcBudgetDateId, newYearEndDate, newVersionNo, newDescription/*Removed for #457, newOpeningBankBalance*/) {

        // 1 - FetchBudget
        // 2 - Adjust values, remove unwanted rows/values
        // 3 - Set remaining rows to ModifiedData = 1
        // 4 - SaveCopiedBudget

        var self = this;
        var deferred = $.Deferred();

        self.FetchBudget(srcBudgetDateId)
            .done(function (budgetObj) {

                // Adjust changeable values, remove unwanted rows/values

                var newBudgetDateId = GenerateGuid();

                budgetObj.BudgetDate.BudgetDate_Source_ID = srcBudgetDateId;
                budgetObj.BudgetDate.BudgetDate_ID = newBudgetDateId; // Assign new id
                budgetObj.BudgetDate.BudgetDate_Date = newYearEndDate;
                budgetObj.BudgetDate.BudgetDate_VersionNo = newVersionNo;
                budgetObj.BudgetDate.BudgetDate_Description = newDescription;
                budgetObj.BudgetDate.BudgetDate_WorkflowStatusId = BudgetWorkflowStatus.New;
                // Removed for #457
                //budgetObj.BudgetDate.BudgetDate_OpeningBankBalance = newOpeningBankBalance;
                budgetObj.BudgetDate.ModifiedData = true; // todo - true means "saved ready for upload", but we may need to set to false if "saved for further mods"

                // Copy applicable tables
                self.CopyCapexes(budgetObj, newBudgetDateId, true);
                self.CopyGrossMargins(budgetObj, newBudgetDateId, true);
                self.CopyDairyYoungstockCals(budgetObj, newBudgetDateId, true);
                self.CopyBeefRearingCals(budgetObj, newBudgetDateId, true);
                self.CopyBreedingEweCals(budgetObj, newBudgetDateId, true);
                self.CopyArableCropReconcils(budgetObj, newBudgetDateId, true);
                self.CopyOverheadCosts(budgetObj, newBudgetDateId, true);
                self.CopyRentSchedules(budgetObj, newBudgetDateId, true);
                self.CopyLoanSchedules(budgetObj, newBudgetDateId, true);
                self.CopyEnterpriseToCustomers(budgetObj, newBudgetDateId, true);

                self.SaveCopiedBudget(budgetObj)
                    .done(function () {
                        // Save succeeded
                        deferred.resolve(newBudgetDateId);
                    })
                    .fail(function (saveFailReasion) {
                        // Save failed
                        deferred.reject(saveFailReasion);
                    });
            })
            .fail(function (fetchFailReason) {
                // Fetch failed
                deferred.reject(fetchFailReason);
            });

        return deferred.promise();
    };

    // #region Copy ArableCropReconcils

    ApiClient.prototype.CopyArableCropReconcils = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy headers
        $.each(budgetObj.ArableCropReconcilHeaders, function (idx, header) {

            var srcHeaderId = header.ArableCropRecon_Header_ID;

            self.CopyArableCropReconcilHeader(header, newBudgetDateId, isSameYear);

            if (header.ModifiedData) {

                // Copy header's lines
                var srcLines = $.grep(budgetObj.ArableCropReconcilLines, function (line) {
                    return StringEquals(line.ArableCropReconcil_Header_ID, srcHeaderId);
                });

                $.each(srcLines, function (idx, line) {
                    self.CopyArableCropReconcilLine(line, header.ArableCropRecon_Header_ID, isSameYear);
                });

                if (!isSameYear) {
                    // Create Opening Valuation In Store Tonnes row (Grain)
                    var openingValuationInStoreTonnesGrainLine = self.CreateArableCropOpeningValuationInStoreTonnesReconcilLine(
                        budgetObj,
                        header.ArableCropRecon_Header_ID,
                        header.ArableCropRecon_Enterprise,
                        ArableCropReconcil_Constants.ColIdx_PrevYearCrop_Grain_Tonnes);

                    budgetObj.ArableCropReconcilLines.push(openingValuationInStoreTonnesGrainLine);

                    // Create Opening Valuation In Store Tonnes row (Straw)
                    var openingValuationInStoreTonnesStrawLine = self.CreateArableCropOpeningValuationInStoreTonnesReconcilLine(
                        budgetObj,
                        header.ArableCropRecon_Header_ID,
                        header.ArableCropRecon_Enterprise,
                        ArableCropReconcil_Constants.ColIdx_PrevYearCrop_Straw_Tonnes);

                    budgetObj.ArableCropReconcilLines.push(openingValuationInStoreTonnesStrawLine);
                }
            }
        });
    };

    ApiClient.prototype.CopyArableCropReconcilHeader = function (header, newBudgetDateId, isSameYear) {

        header.ArableCropRecon_Header_ID = GenerateGuid(); // Assign new id
        header.ArableCropRecon_YearEnd = newBudgetDateId; // Tie to the new budget copy
        header.ModifiedData = true;

    };

    ApiClient.prototype.CopyArableCropReconcilLine = function (line, newHeaderId, isSameYear) {

        // Copy only 'Opening valuation in store' cells, Contract Operations £/(ac/ha), and Variable Costs Area (ac/ha) and £/(ac/ha)

        function IsLineRelevant(ln) {

            var enterprise = StringReplaceLineBreaks(ln.ArableCropReconcil_Enterprise, " ");

            if (isSameYear) {
                if (StringEquals(enterprise, "Opening valuation in store")
                    && StringArrayContains([ArableCropReconcil_Constants.ColIdx_PrevYearCrop_Grain_Tonnes,
                    ArableCropReconcil_Constants.ColIdx_PrevYearCrop_Grain_CostPerTonne], ln.ArableCropReconcil_ColIdx)) {

                    return true;
                }

                if (StringArrayContains(["Ploughing", "Cultivations", "Drilling", "Fertilising", "Spraying"], enterprise)
                    && StringArrayContains([ArableCropReconcil_Constants.ColIdx_ArableContractingCosts_OpeningTillage_CostPerArea,
                    ArableCropReconcil_Constants.ColIdx_ArableContractingCosts_TotalCrop_CostPerArea,
                    ArableCropReconcil_Constants.ColIdx_ArableContractingCosts_ClosingTillage_CostPerArea], ln.ArableCropReconcil_ColIdx)) {

                    return true;
                }

                if (StringArrayContains(["Fertilisers", "Purchased seed", "Home-grownseed & royalties", "Sprays", "Miscellaneous"], enterprise)
                    && StringArrayContains([ArableCropReconcil_Constants.ColIdx_ArableCropTilages_OpeningTillages_Area,
                    ArableCropReconcil_Constants.ColIdx_ArableCropTilages_OpeningTillages_CostPerArea], ln.ArableCropReconcil_ColIdx)) {

                    return true;
                }
            }
            else { // !isSameYear
                if (StringEquals(enterprise, "Closing valuation in store")
                    && StringArrayContains([ArableCropReconcil_Constants.ColIdx_PrevYearCrop_Grain_CostPerTonne,
                    ArableCropReconcil_Constants.ColIdx_PrevYearCrop_Straw_CostPerTonne],
                        ln.ArableCropReconcil_ColIdx)) { // Closing valuation in store row, £/Tonne col, Grain and Straw sections

                    // Adjust - move to Opening Valuation In Store row
                    ln.ArableCropReconcil_Enterprise = "Opening valuation in store";

                    return true;
                }
                // Move ARABLE CONTRACTING COSTS - Closing Tillage - £/(ac/ha) to Opening Tillage	
                else if (StringArrayContains(["Ploughing", "Cultivations", "Drilling", "Fertilising", "Spraying"], enterprise)
                    && ln.ArableCropReconcil_ColIdx == ArableCropReconcil_Constants.ColIdx_ArableContractingCosts_ClosingTillage_CostPerArea) {

                    // Adjust
                    ln.ArableCropReconcil_ColIdx = ArableCropReconcil_Constants.ColIdx_ArableContractingCosts_OpeningTillage_CostPerArea;

                    return true;
                }
                // Move ARABLE CROP TILLAGES-CLOSING TILLAGES-Area (ac/ha) and £/(ac/ha) to OPENING TILLAGES
                else if (StringArrayContains(["Fertilisers", "Purchased seed", "Home-grown seed & royalties", "Sprays", "Miscellaneous"], enterprise)) {

                    if (ln.ArableCropReconcil_ColIdx == ArableCropReconcil_Constants.ColIdx_ArableCropTilages_ClosingTillages_Area) {
                        // Adjust - move Closing Tillages-Area to Opening Tillages-Area
                        ln.ArableCropReconcil_ColIdx = ArableCropReconcil_Constants.ColIdx_ArableCropTilages_OpeningTillages_Area;

                        return true;
                    }
                    else if (ln.ArableCropReconcil_ColIdx == ArableCropReconcil_Constants.ColIdx_ArableCropTilages_ClosingTillages_CostPerArea) {
                        // Adjust - move Closing Tillages-£ to Opening Tillages-£
                        ln.ArableCropReconcil_ColIdx = ArableCropReconcil_Constants.ColIdx_ArableCropTilages_OpeningTillages_CostPerArea;

                        return true;
                    }

                }
            }

            return false;
        }

        if (!IsLineRelevant(line)) {
            return;
        }

        line.ArableCropReconcil_Line_ID = GenerateGuid(); // Assign new id
        line.ArableCropReconcil_Header_ID = newHeaderId; // Tie to the new header copy
        line.ModifiedData = true;
    };

    /**
     * 
     * @param {any} budgetObj
     * @param {any} arableCropReconcilHeaderId
     * @param {any} enterpriseName
     * @param {number} colIdx 1 = Grain, 4 = Straw
     */
    ApiClient.prototype.CreateArableCropOpeningValuationInStoreTonnesReconcilLine = function (budgetObj, arableCropReconcilHeaderId, enterpriseName, colIdx) {

        var closingValuationInStoreTonnes = this.BudgetCalculator.CalculateArableCropReconcil_PreviousYearCrop_ClosingValuationInStoreTonnes(
            budgetObj.ArableCropReconcilHeaders,
            budgetObj.ArableCropReconcilLines,
            enterpriseName,
            colIdx);

        var reconcilLine = {
            ArableCropReconcil_Line_ID: GenerateGuid(),
            ArableCropReconcil_Header_ID: arableCropReconcilHeaderId,
            ArableCropReconcil_Enterprise: "Opening valuation in store",
            ArableCropReconcil_ColIdx: colIdx,
            ArableCropReconcil_Line_Value: closingValuationInStoreTonnes
        };

        return reconcilLine;
    };

    // #endregion

    // #region Copy BeefRearingCals

    ApiClient.prototype.CopyBeefRearingCals = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy headers
        $.each(budgetObj.BeefRearingCalHeaders, function (idx, header) {

            var srcHeaderId = header.BeefRearing_Header_ID;

            self.CopyBeefRearingCalHeader(header, newBudgetDateId, isSameYear);

            if (header.ModifiedData) {

                // Copy header's lines
                var srcLines = $.grep(budgetObj.BeefRearingCalLines, function (line) {
                    return StringEquals(line.BeefRearingCalendar_Header_ID, srcHeaderId);
                });

                $.each(srcLines, function (idx, line) {
                    self.CopyBeefRearingCalLine(line, header.BeefRearing_Header_ID, isSameYear);
                });
            }
        });

    };

    ApiClient.prototype.CopyBeefRearingCalHeader = function (header, newBudgetDateId, isSameYear) {

        header.BeefRearing_Header_ID = GenerateGuid(); // Assign new id
        header.BeefRearing_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
        header.ModifiedData = true;

    };

    ApiClient.prototype.CopyBeefRearingCalLine = function (line, newHeaderId, isSameYear) {

        var self = this;

        function IsLineRelevant(ln) {

            if (isSameYear
                && IsBetween(ln.BeefRearingCalendar_Line_RowIdx, BeefRearingCal_Constants.RowIdx_AgeGroupsStart, BeefRearingCal_Constants.RowIdx_AgeGroupsEnd)) {

                return true;
            }
            else if (!isSameYear
                && IsBetween(ln.BeefRearingCalendar_Line_RowIdx, BeefRearingCal_Constants.RowIdx_AgeGroupsStart, BeefRearingCal_Constants.RowIdx_AgeGroupsEnd)) {

                // Adjust - move Closing Valuation Number and Value cols to Opening Valuation
                ln.BeefRearingCalendar_Line_Month1 = ln.BeefRearingCalendar_Line_Month10;
                ln.BeefRearingCalendar_Line_Month2 = ln.BeefRearingCalendar_Line_Month11;
                delete ln.BeefRearingCalendar_Line_Month10;
                delete ln.BeefRearingCalendar_Line_Month11;

                return true;
            }

            return false;
        }

        if (!IsLineRelevant(line)) {
            return;
        }

        line.BeefRearingCalendar_Line_ID = GenerateGuid(); // Assign new id
        line.BeefRearingCalendar_Header_ID = newHeaderId; // Tie to the new header copy
        line.ModifiedData = true;
    };

    // #endregion

    // #region Copy BreedingEweCals

    ApiClient.prototype.CopyBreedingEweCals = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy headers
        $.each(budgetObj.BreedingEweCalHeaders, function (idx, header) {

            var srcHeaderId = header.BreedingEwes_Header_ID;

            self.CopyBreedingEweCalHeader(header, newBudgetDateId, isSameYear);

            if (header.ModifiedData) {

                // Copy header's lines
                var srcLines = $.grep(budgetObj.BreedingEweCalLines, function (line) {
                    return StringEquals(line.BreedingEwesCalendar_Header_ID, srcHeaderId);
                });

                $.each(srcLines, function (idx, line) {
                    self.CopyBreedingEweCalLine(line, header.BreedingEwes_Header_ID, isSameYear);
                });

                if (!isSameYear) {
                    // Create Opening Lamb Numbers row
                    var openingLambNumbersCalLine = self.CreateBreedingEwesOpeningLambNumbersCalLine(budgetObj, header.BreedingEwes_Header_ID, header.BreedingEwes_Header_Enterprise);
                    budgetObj.BreedingEweCalLines.push(openingLambNumbersCalLine);
                }
            }
        });
    };

    ApiClient.prototype.CreateBreedingEwesOpeningLambNumbersCalLine = function (budgetObj, calHeaderId, enterpriseName) {

        var self = this;

        var closingTotal = self.BudgetCalculator.CalculateBreedingEweCalLambYearlyTotalQty(
            budgetObj.BreedingEweCalHeaders,
            budgetObj.BreedingEweCalLines,
            enterpriseName);

        var openingLambNumbersCalLine = {
            BreedingEwesCalendar_Line_ID: GenerateGuid(),
            BreedingEwesCalendar_Header_ID: calHeaderId,
            BreedingEwesCalendar_Line_RowIdx: BreedingEwesCal_Constants.RowIdx_OpeningLambNumbers, // Opening Lamb Numbers row
            BreedingEwesCalendar_Line_Total: closingTotal,
            ModifiedData: true
        };

        return openingLambNumbersCalLine;
    };

    ApiClient.prototype.CopyBreedingEweCalHeader = function (header, newBudgetDateId, isSameYear) {

        header.BreedingEwes_Header_ID = GenerateGuid(); // Assign new id
        header.BreedingEwes_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
        header.ModifiedData = true;

    };

    ApiClient.prototype.CopyBreedingEweCalLine = function (line, newHeaderId, isSameYear) {

        var self = this;

        function IsLineRelevant(ln) {
            if (isSameYear && IsBetween(ln.BreedingEwesCalendar_Line_RowIdx, BreedingEwesCal_Constants.RowIdx_OpeningLambNumbers, BreedingEwesCal_Constants.RowIdx_LambValuationPoundsPerHead)) { // Only copy Opening lamb numbers and Lamb valuation (£/head) lines
                return true;
            }
            else if (!isSameYear && ln.BeefRearingCalendar_Line_RowIdx == BreedingEwesCal_Constants.RowIdx_ClosingLambValuationPoundsPerHead) { // Only copy Closing lamb valuation (£/head) line

                // Adjust
                ln.BreedingEwesCalendar_Line_RowIdx = BreedingEwesCal_Constants.RowIdx_LambValuationPoundsPerHead; // Move to Lamb valuation (£/head) row

                return true;
            }

            return false;
        }

        if (!IsLineRelevant(line)) {
            return;
        }

        line.BreedingEwesCalendar_Line_ID = GenerateGuid(); // Assign new id
        line.BreedingEwesCalendar_Header_ID = newHeaderId; // Tie to the new header copy
        line.ModifiedData = true;
    };

    // #endregion

    // #region Copy Capexes

    ApiClient.prototype.CopyCapexes = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy headers
        $.each(budgetObj.CapexHeaders, function (idx, header) {

            var srcHeaderId = header.Capex_Header_ID;

            self.CopyCapexHeader(header, newBudgetDateId, isSameYear);

            if (header.ModifiedData) {
                // Copy header's lines
                var srcLines = $.grep(budgetObj.CapexLines, function (line) {
                    return StringEquals(line.Capex_Header_ID, srcHeaderId);
                });

                $.each(srcLines, function (idx, line) {

                    self.CopyCapexLine(line, header.Capex_Header_ID, isSameYear);
                });

                if (!isSameYear) {
                    // Calculate closing balances of various Categories and use them to create new opening balance records

                    // Land & Property
                    var landAndPropertyOpeningBalLine = self.CreateOpeningBalanceCapexLine(header.Capex_Header_ID, CapexPlans_Constants.LandAndProperty_Sales_Total.dbRowid, srcLines, CategoryLkp.OpeningBalance_LandAndProperty);
                    budgetObj.CapexLines.push(landAndPropertyOpeningBalLine);

                    // Buildings & Structures
                    var buildingsAndStructuresOpeningBalLine = self.CreateOpeningBalanceCapexLine(header.Capex_Header_ID, CapexPlans_Constants.BuildingAndStructures_Sales_Total.dbRowid, srcLines, CategoryLkp.OpeningBalance_BuildingsAndStructures);
                    budgetObj.CapexLines.push(buildingsAndStructuresOpeningBalLine);

                    // Short-Term Fixtures
                    var shortTermFixturesOpeningBalLine = self.CreateOpeningBalanceCapexLine(header.Capex_Header_ID, CapexPlans_Constants.ShortTermFixtures_Sales_Total.dbRowid, srcLines, CategoryLkp.OpeningBalance_ShortTermFixtures);
                    budgetObj.CapexLines.push(shortTermFixturesOpeningBalLine);

                    // Machinery
                    var machineryOpeningBalLine = self.CreateOpeningBalanceCapexLine(header.Capex_Header_ID, CapexPlans_Constants.Machinery_Sales_Total.dbRowid, srcLines, CategoryLkp.OpeningBalance_Machinery);
                    budgetObj.CapexLines.push(machineryOpeningBalLine);

                    // Investments
                    var investmentsOpeningBalLine = self.CreateOpeningBalanceCapexLine(header.Capex_Header_ID, CapexPlans_Constants.Investments_Sales_Total.dbRowid, srcLines, CategoryLkp.OpeningBalance_Investments);
                    budgetObj.CapexLines.push(investmentsOpeningBalLine);
                }
            }

        });

    };

    ApiClient.prototype.CreateOpeningBalanceCapexLine = function (capexHeaderId, openingBalanceRowIdx, allCapexLines, openingBalanceCategoryId) {

        var self = this;
        var closingBalance = self.BudgetCalculator.Calculate_CapexPlans_ClosingBalance(allCapexLines, openingBalanceCategoryId);

        var openingBalCapexLine = {
            Capex_Line_ID: GenerateGuid(),
            Capex_Header_ID: capexHeaderId,
            Capex_Line_RowIdx: openingBalanceRowIdx,
            Capex_Line_ColIdx: CapexPlans_Constants.ColIdx_OpeningValuation,
            Capex_Line_Value: closingBalance,
            Capex_Line_Enterprise: null,
            Capex_Line_BreakdownOn: openingBalanceCategoryId,
            ModifiedData: true
        };

        return openingBalCapexLine;
    };

    ApiClient.prototype.CopyCapexHeader = function (header, newBudgetDateId, isSameYear) {

        header.Capex_Header_ID = GenerateGuid(); // Assign new id
        header.Capex_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
        header.ModifiedData = true;

    };

    ApiClient.prototype.CopyCapexLine = function (line, newHeaderId, isSameYear) {

        if (!isSameYear) {
            return false;
        }

        var validCats = [CategoryLkp.OpeningBalance_LandAndProperty,
        CategoryLkp.OpeningBalance_BuildingsAndStructures,
        CategoryLkp.OpeningBalance_ShortTermFixtures,
        CategoryLkp.OpeningBalance_Machinery,
        CategoryLkp.OpeningBalance_Investments];

        if (isSameYear && !StringArrayContains(validCats, line.Capex_Line_BreakdownOn)) {
            return;
        }

        line.Capex_Line_ID = GenerateGuid(); // Assign new id
        line.Capex_Header_ID = newHeaderId; // Tie to the new header copy
        line.ModifiedData = true;
    };

    // #endregion

    // #region Copy Dairy Youngstock Calendars

    ApiClient.prototype.CopyDairyYoungstockCals = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy headers
        $.each(budgetObj.DairyYoungstockCalHeaders, function (idx, header) {

            var srcHeaderId = header.DairyYoungstockCal_Header_ID;

            self.CopyDairyYoungstockCalHeader(header, newBudgetDateId, isSameYear);

            if (header.ModifiedData) {
                // Copy header's lines
                var srcLines = $.grep(budgetObj.DairyYoungstockCalLines, function (line) {
                    return StringEquals(line.DairyYoungstockCalendar_Header_ID, srcHeaderId);
                });

                $.each(srcLines, function (idx, line) {
                    self.CopyDairyYoungstockCalLine(line, header.DairyYoungstockCal_Header_ID, isSameYear);
                });
            }
        });

    };

    ApiClient.prototype.CopyDairyYoungstockCalHeader = function (header, newBudgetDateId, isSameYear) {

        header.DairyYoungstockCal_Header_ID = GenerateGuid(); // Assign new id
        header.DairyYoungstockCal_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
        header.ModifiedData = true;

    };

    ApiClient.prototype.CopyDairyYoungstockCalLine = function (line, newHeaderId, isSameYear) {

        var self = this;

        function IsLineRelevant(ln) {

            if (isSameYear
                && ln.DairyYoungstockCalendar_Line_RowIdx != null
                && IsBetween(ln.DairyYoungstockCalendar_Line_RowIdx, YoungstockCal_Constants.RowIdx_AgeGroupsStart, YoungstockCal_Constants.RowIdx_AgeGroupsEnd)) { // Only copy Opening & Closing Valuation lines

                return true;
            }
            else if (!isSameYear
                && IsBetween(ln.DairyYoungstockCalendar_Line_RowIdx, YoungstockCal_Constants.RowIdx_AgeGroupsStart, YoungstockCal_Constants.RowIdx_AgeGroupsEnd)) { // Only copy Opening & Closing Valuation lines

                // Adjust
                ln.DairyYoungstockCalendar_Line_Month1 = ln.DairyYoungstockCalendar_Line_Month10; // Copy Closing Valuation Number to Opening Valuation Number
                ln.DairyYoungstockCalendar_Line_Month2 = ln.DairyYoungstockCalendar_Line_Month11; // Copy Closing Valuation Value to Opening Valuation Value
                delete ln.DairyYoungstockCalendar_Line_Month10; // Delete Closing Valuation Number
                delete ln.DairyYoungstockCalendar_Line_Month11; // Delete Closing Valuation Value

                return true;
            }

            return false;
        }

        if (!IsLineRelevant(line)) {
            return;
        }

        line.DairyYoungstockCalendar_Line_ID = GenerateGuid(); // Assign new id
        line.DairyYoungstockCalendar_Header_ID = newHeaderId; // Tie to the new header copy
        line.ModifiedData = true;
    };

    // #endregion

    // #region Copy Gross Margins

    ApiClient.prototype.CopyGrossMargins = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy Gross Margins
        $.each(budgetObj.GrossMargins, function (idx, grossMargin) {

            var srcGrossMarginId = grossMargin.GrossMargin_ID;

            self.CopyGrossMargin(grossMargin, newBudgetDateId, isSameYear, budgetObj);

        });

        //if (!isSameYear) {

        //    // This appears to no longer be needed now we're storing all GM formula values and the logic in ApiClient.CopyGrossMargin handles what's being done here

        //    // Generate various GM Opening figures from calculated Closing figures

        //    $.each(budgetObj.EnterpriseToCustomers, function (idx, e2c) {

        //        switch (e2c.Enterprise_Type.toLowerCase()) {

        //            case EnterpriseTypes.BreedingEwes.toLowerCase():
        //                var openingFlockValuationNumberGM = self.CreateBreedingEwesOpeningFlockValuationNumberGrossMargin(newBudgetDateId, budgetObj, e2c.Enterprise_Name);
        //                budgetObj.GrossMargins.push(openingFlockValuationNumberGM);
        //                break;

        //            case EnterpriseTypes.DairyHerd.toLowerCase():
        //                // Create a GM record for Opening Herd Valuation row & Number col, by copying src budget's Closing Herd Valuation row & Number col
        //                var openingHerdValuationNumberGM = self.CreateDairyHerdOpeningHerdValuationNumberGrossMargin(newBudgetDateId, budgetObj, e2c.Enterprise_Name);
        //                budgetObj.GrossMargins.push(openingHerdValuationNumberGM);
        //                break;

        //            case EnterpriseTypes.ForageCrop.toLowerCase():
        //                var openingValuationGM = self.CreateForageCropOpeningValuationGrossMargin(newBudgetDateId, budgetObj, e2c.Enterprise_Name);
        //                budgetObj.GrossMargins.push(openingValuationGM);
        //                break;

        //            case EnterpriseTypes.Grassland.toLowerCase():
        //                var openingValuationGM = self.CreateGrasslandOpeningValuationGrossMargin(newBudgetDateId, budgetObj, e2c.Enterprise_Name);
        //                budgetObj.GrossMargins.push(openingValuationGM);
        //                break;

        //            case EnterpriseTypes.LayingPoultry.toLowerCase():
        //                var openingValuationGM = self.CreateLayingPoultryOpeningValuationGrossMargin(newBudgetDateId, budgetObj, e2c.Enterprise_Name);
        //                budgetObj.GrossMargins.push(openingValuationGM);
        //                break;

        //            case EnterpriseTypes.ArableCrop.toLowerCase():
        //            case EnterpriseTypes.BeefRearing.toLowerCase():
        //            case EnterpriseTypes.Commercial.toLowerCase():
        //            case EnterpriseTypes.Livestock.toLowerCase():
        //            case EnterpriseTypes.OtherCrop.toLowerCase():
        //            case EnterpriseTypes.OtherRearing.toLowerCase():
        //            case EnterpriseTypes.SucklerCow.toLowerCase():
        //            case EnterpriseTypes.Youngstock.toLowerCase():
        //                // Nothing to copy according to spec
        //                break;

        //            // Handle other GM enterprises

        //            default:
        //                console.error("Unexpected Enterprise Type %s", e2c.Enterprise_Type);
        //                break;
        //        }
        //    });

        //}
    };

    /**
     * Deletes GM item fields, other than those that line up with the specified col indexex.
     * @param {GrossMargin} grossMargin GM object.
     * @param {[]|number} colsToPreserve Array of col indexes, or the col index, to preserve.
     */
    ApiClient.prototype.DeleteGrossMarginMembers = function (grossMargin, colsToPreserve) {

        if (colsToPreserve.length === undefined) {
            // Convert single value to array
            colsToPreserve = [colsToPreserve];
        }

        if (!StringArrayContains(colsToPreserve, GM_Constants.ColIdx_Label)) {
            delete grossMargin.GrossMargin_Enterprise_Custom;
        }

        if (!StringArrayContains(colsToPreserve, GM_Constants.ColIdx_Numbers)) {
            delete grossMargin.GrossMargin_UnitsNumSold;
        }

        if (!StringArrayContains(colsToPreserve, GM_Constants.ColIdx_Value)) {
            delete grossMargin.GrossMargin_UnitValueEach;
        }

        if (!StringArrayContains(colsToPreserve, GM_Constants.ColIdx_Total)) {
            delete grossMargin.GrossMargin_UnitsValueTotal;
        }

        if (!StringArrayContains(colsToPreserve, GM_Constants.ColIdx_PerArea)) {
            delete grossMargin.GrossMargin_UnitsValueAvg;
        }

        if (!StringArrayContains(colsToPreserve, DairyHerdGM_Constants.ColIdx_UnitsPricePerLitre)) {
            delete grossMargin.GrossMargin_UnitsPricePerLitre;
        }

        //if (!StringArrayContains(colsToPreserve, 6) && !StringArrayContains(colsToPreserve, 7)) {
        //    delete grossMargin.GrossMargin_Notes;
        //}

    };

    ApiClient.prototype.CopyGrossMargin = function (grossMargin, newBudgetDateId, isSameYear, budgetObj) {

        var self = this;

        function IsGmRelevant(gm) {

            // Check for 'Breeding Ewes GM'
            if (StringEquals(gm.GrossMargin_CategoryType, CategoryLkp.BreedingEwesGM)) {

                if (isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, BreedingEwesGM_Constants.RowIdx_OpeningFlockValuation) // Opening flock valuation row
                ) {
                    // Adjust
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
                else if (!isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, BreedingEwesGM_Constants.RowIdx_ClosingFlockValuation)
                ) {
                    // Adjust - Move Closing Flock Valuation Value (£) to Opening Flock Valuation Value
                    gm.GrossMargin_RowIdx = BreedingEwesGM_Constants.RowIdx_OpeningFlockValuation;
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
            }

            // Check for 'Dairy Herd GM'
            if (StringEquals(gm.GrossMargin_CategoryType, CategoryLkp.DairyHerdGM)) {

                if (isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, DairyHerdGM_Constants.RowIdx_OpeningHerdValuation) // Opening herd valuation row
                ) {
                    // Adjust
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
                else if (!isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, DairyHerdGM_Constants.RowIdx_ClosingHerdValuation) // Closing herd valuation row
                ) {
                    // Adjust
                    gm.GrossMargin_RowIdx = DairyHerdGM_Constants.RowIdx_OpeningHerdValuation; // Move Closing Herd Valuation row cells to Opening Herd Valuation row
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
            }

            // Check for 'Forage Crop GM'
            if (StringEquals(gm.GrossMargin_CategoryType, CategoryLkp.ForageCropGM)) {

                if (isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, ForageCropGM_Constants.RowIdx_OpeningValuation) // Opening valuation row
                ) {
                    // Adjust
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
                else if (!isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, ForageCropGM_Constants.RowIdx_ClosingValuation)
                ) {
                    // Adjust - move Closing valuation to Opening valuation
                    gm.GrossMargin_RowIdx = ForageCropGM_Constants.RowIdx_OpeningValuation;
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
            }

            // Check for 'Grassland GM'
            if (StringEquals(gm.GrossMargin_CategoryType, CategoryLkp.GrasslandGM)) {

                if (isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, GrasslandGM_Constants.RowIdx_OpeningValuation) // Opening Valuation row
                ) {
                    // Adjust
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
                else if (!isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, GrasslandGM_Constants.RowIdx_ClosingValuation) // Closing valuation
                ) {
                    // Adjust - move Closing Valuation row to Opening Valuation row
                    gm.GrossMargin_RowIdx = GrasslandGM_Constants.RowIdx_OpeningValuation;
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
            }

            // Check for 'Laying Poultry GM'
            if (StringEquals(gm.GrossMargin_CategoryType, CategoryLkp.LayingPoultryGM)) {

                if (isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, LayingPoultryGM_Constants.RowIdx_OpeningValuation) // Opening Valuation row
                ) {
                    // Adjust
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
                else if (!isSameYear
                    && StringEquals(gm.GrossMargin_RowIdx, LayingPoultryGM_Constants.RowIdx_ClosingValuation) // Closing valuation
                ) {
                    // Adjust - move Closing Valuation row to Opening Valuation row
                    gm.GrossMargin_RowIdx = LayingPoultryGM_Constants.RowIdx_OpeningValuation;
                    self.DeleteGrossMarginMembers(gm, [GM_Constants.ColIdx_Numbers, GM_Constants.ColIdx_Value]);

                    return true;
                }
            }

            // Add other GM relevancy checks here...

            return false;
        }

        if (!IsGmRelevant(grossMargin)) {
            return;
        }

        grossMargin.GrossMargin_ID = GenerateGuid(); // Assign new id
        grossMargin.GrossMargin_YearEnd = newBudgetDateId; // Tie to the new budget copy
        grossMargin.ModifiedData = true; // Set flag indicating it needs storing

    };

    // #endregion Copy Gross Margins

    // #region Copy Loan Schedules

    ApiClient.prototype.CopyLoanSchedules = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy headers
        $.each(budgetObj.LoanScheduleHeaders, function (idx, header) {

            var srcHeaderId = header.LoanSchedules_Header_ID;

            self.CopyLoanScheduleHeader(header, newBudgetDateId, isSameYear);

            if (header.ModifiedData) {
                // Copy header's lines
                var srcLines = $.grep(budgetObj.LoanScheduleLines, function (line) {
                    return StringEquals(line.LoanSchedules_Header_ID, srcHeaderId);
                });

                $.each(srcLines, function (idx, line) {
                    self.CopyLoanScheduleLine(line, header.LoanSchedules_Header_ID, isSameYear, header.LoanSchedules_Header_Category_ID);
                });
            }
        });

    };

    ApiClient.prototype.CopyLoanScheduleHeader = function (header, newBudgetDateId, isSameYear) {

        header.LoanSchedules_Header_ID = GenerateGuid(); // Assign new id
        header.LoanSchedules_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
        header.ModifiedData = true;
    };

    ApiClient.prototype.CopyLoanScheduleLine = function (line, newHeaderId, isSameYear, headerCategoryId) {

        var self = this;

        function IsLineRelevant(ln) {

            if (isSameYear) {
                // Copy all lines
                return true;
            }
            else {
                // Different year

                // Gather indexes of rows that should have their Opening Balance replaced with the Closing Balance
                var loanRowIdsToAdjustOpeningBalance = [];

                switch (headerCategoryId) {
                    case CategoryLkp.HPLoanSchedule:
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan1.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan2.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan3.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan4.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan5.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan6.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan7.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan8.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan9.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.ExistingLoan10.capitalRowIdx);

                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.NewLoan1.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.NewLoan2.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.NewLoan3.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(HPLoanScheduleConstants.NewLoan4.capitalRowIdx);
                        break;

                    case CategoryLkp.MortgageSchedule:
                    case CategoryLkp.TradeLoanSchedule:
                    case CategoryLkp.BankLoanSchedule:
                    case CategoryLkp.PrivateLoanSchedule:
                        loanRowIdsToAdjustOpeningBalance.push(LoanSchedule_Constants.ExistingLoan1.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(LoanSchedule_Constants.ExistingLoan2.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(LoanSchedule_Constants.ExistingLoan3.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(LoanSchedule_Constants.ExistingLoan4.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(LoanSchedule_Constants.ExistingLoan5.capitalRowIdx);

                        loanRowIdsToAdjustOpeningBalance.push(LoanSchedule_Constants.NewLoan1.capitalRowIdx);
                        loanRowIdsToAdjustOpeningBalance.push(LoanSchedule_Constants.NewLoan2.capitalRowIdx);
                        break;

                    default:
                        console.error("Unexpected Loan Header Category Id: %d", headerCategoryId);
                        return false;
                }

                if (StringArrayContains(loanRowIdsToAdjustOpeningBalance, ln.LoanSchedules_Line_RowIdx)) {
                    // Adjust - replace Opening Balance with calculated Closing Balance
                    ln.LoanSchedules_OpeningBalance = self.BudgetCalculator.CalculateLoanScheduleClosingBalance(ln);
                }

                return true;
            }

            return false;
        }

        if (!IsLineRelevant(line)) {
            return;
        }

        // Do not copy the month, total and closing balance column figures
        delete line.LoanSchedules_Line_Month1;
        delete line.LoanSchedules_Line_Month2;
        delete line.LoanSchedules_Line_Month3;
        delete line.LoanSchedules_Line_Month4;
        delete line.LoanSchedules_Line_Month5;
        delete line.LoanSchedules_Line_Month6;
        delete line.LoanSchedules_Line_Month7;
        delete line.LoanSchedules_Line_Month8;
        delete line.LoanSchedules_Line_Month9;
        delete line.LoanSchedules_Line_Month10;
        delete line.LoanSchedules_Line_Month11;
        delete line.LoanSchedules_Line_Month12;
        delete line.LoanSchedules_Line_Total;
        delete line.LoanSchedules_Line_ClosingBalance;

        line.LoanSchedules_Line_ID = GenerateGuid(); // Assign new id
        line.LoanSchedules_Header_ID = newHeaderId; // Tie to the new header copy
        line.ModifiedData = true;
    };

    // #endregion

    // #region Copy Overhead Costs

    ApiClient.prototype.CopyOverheadCosts = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy Overhead Costs
        $.each(budgetObj.OverheadCosts, function (idx, overheadCost) {

            var srcOverheadCostId = overheadCost.OverheadCosts_ID;

            self.CopyOverheadCost(overheadCost, newBudgetDateId, isSameYear);

        });

    };

    ApiClient.prototype.CopyOverheadCost = function (overheadCost, newBudgetDateId, isSameYear) {

        function IsOverheadCostRelevent(oc) {

            //if (!isSameYear && oc.OverheadCosts_RowIdx == 45) { // Skip Current Account Interest row (commented-out due to this now being a formula)
            //    return false;
            //}

            return true;
        }

        if (!IsOverheadCostRelevent(overheadCost)) {
            return;
        }

        delete overheadCost.OverheadCosts_Notes;

        overheadCost.OverheadCosts_ID = GenerateGuid(); // Assign new id
        overheadCost.OverheadCosts_YearEnd = newBudgetDateId; // Tie to the new budget copy
        overheadCost.ModifiedData = true;

    };

    // #endregion

    // #region Copy Rent Schedules (aka Rental Costs)

    ApiClient.prototype.CopyRentSchedules = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy headers
        $.each(budgetObj.RentScheduleHeaders, function (idx, header) {

            var srcHeaderId = header.RentSchedules_Header_ID;

            self.CopyRentScheduleHeader(header, newBudgetDateId, isSameYear);

            if (header.ModifiedData) {
                // Copy header's lines
                var srcLines = $.grep(budgetObj.RentScheduleLines, function (line) {
                    return StringEquals(line.RentSchedules_Header_ID, srcHeaderId);
                });

                $.each(srcLines, function (idx, line) {
                    self.CopyRentScheduleLine(line, header.RentSchedules_Header_ID, isSameYear);
                });
            }
        });

    };

    ApiClient.prototype.CopyRentScheduleHeader = function (header, newBudgetDateId, isSameYear) {

        header.RentSchedules_Header_ID = GenerateGuid(); // Assign new id
        header.RentSchedules_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
        header.ModifiedData = true;

    };

    ApiClient.prototype.CopyRentScheduleLine = function (line, newHeaderId, isSameYear) {

        line.RentSchedules_Line_ID = GenerateGuid(); // Assign new id
        line.RentSchedules_Header_ID = newHeaderId; // Tie to the new header copy
        line.ModifiedData = true;
    };

    // #endregion

    // #region Copy Enterprise-to-Customers (for the specific Budget)

    ApiClient.prototype.CopyEnterpriseToCustomers = function (budgetObj, newBudgetDateId, isSameYear) {

        var self = this;

        // Copy Enterprise-to-Customers (Enterprise-to-Budgets, actually)
        $.each(budgetObj.EnterpriseToCustomers, function (idx, e2c) {

            self.CopyEnterpriseToCustomer(e2c, newBudgetDateId, isSameYear);

        });

    };

    ApiClient.prototype.CopyEnterpriseToCustomer = function (e2c, newBudgetDateId, isSameYear) {

        e2c.Enter_Custom_ID = GenerateGuid(); // Assign new id
        e2c.Enter_Custo_YearEnd = newBudgetDateId; // Tie to the new budget copy
        e2c.ModifiedData = true;
    };

    // #endregion

    // #endregion Copying

    // #region Copying (not needed)

    // #region Copy Cashflows

    //ApiClient.prototype.CopyCashflows = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy headers
    //    $.each(budgetObj.CashflowHeaders, function (idx, header) {

    //        var srcHeaderId = header.Cashflow_Header_ID;

    //        self.CopyCashflowHeader(header, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {

    //            // Copy header's lines
    //            var srcLines = $.grep(budgetObj.CashflowLines, function (line) {
    //                return StrEq(line.Cashflow_Header_ID, srcHeaderId);
    //            });

    //            $.each(srcLines, function (idx, line) {
    //                self.CopyCashflowLine(line, header.Cashflow_Header_ID, isSameYear);
    //            });
    //        }
    //    });

    //};

    //ApiClient.prototype.CopyCashflowHeader = function (header, newBudgetDateId, isSameYear) {

    //    header.Cashflow_Header_ID = GenerateGuid(); // Assign new id
    //    header.Cashflow_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    header.ModifiedData = true;

    //};

    //ApiClient.prototype.CopyCashflowLine = function (line, newHeaderId, isSameYear) {

    //    delete line.ModifiedData;

    //    line.Cashflow_Line_ID = GenerateGuid(); // Assign new id
    //    line.Cashflow_Header_ID = newHeaderId; // Tie to the new header copy
    //    line.ModifiedData = true;
    //};

    // #endregion

    // #region Copy Crop Schedules

    //ApiClient.prototype.CopyCropSchedules = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy schedules
    //    $.each(budgetObj.CropSchedules, function (idx, schedule) {

    //        var srcScheduleId = schedule.CropSchedule_ID;

    //        self.CopyCropSchedule(schedule, newBudgetDateId, isSameYear);

    //    });

    //};

    //ApiClient.prototype.CopyCropSchedule = function (schedule, newBudgetDateId, isSameYear) {

    //    schedule.CropSchedule_ID = GenerateGuid(); // Assign new id
    //    schedule.CropSchedule_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    schedule.ModifiedData = true;

    //};

    // #endregion

    // #region Copy Dairy Herd Calendars

    //ApiClient.prototype.CopyDairyHerdCals = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy headers
    //    $.each(budgetObj.DairyHerdCalHeaders, function (idx, header) {

    //        var srcHeaderId = header.DairyHerdCal_Header_ID;

    //        self.CopyDairyHerdCalHeader(header, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {
    //            // Copy header's lines
    //            var srcLines = $.grep(budgetObj.DairyHerdCalLines, function (line) {
    //                return StrEq(line.DairyHerdCalendar_Header_ID, srcHeaderId);
    //            });

    //            $.each(srcLines, function (idx, line) {
    //                self.CopyDairyHerdCalLine(line, header.DairyHerdCal_Header_ID, isSameYear);
    //            });
    //        }
    //    });

    //};

    //ApiClient.prototype.CopyDairyHerdCalHeader = function (header, newBudgetDateId, isSameYear) {

    //    header.DairyHerdCal_Header_ID = GenerateGuid(); // Assign new id
    //    header.DairyHerdCal_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    header.ModifiedData = true;

    //};

    //ApiClient.prototype.CopyDairyHerdCalLine = function (line, newHeaderId, isSameYear) {

    //    line.DairyHerdCalendar_Line_ID = GenerateGuid(); // Assign new id
    //    line.DairyHerdCalendar_Header_ID = newHeaderId; // Tie to the new header copy
    //    line.ModifiedData = true;
    //};

    // #endregion

    // #region Copy DOFs (disposal of funds)

    //ApiClient.prototype.CopyDOFs = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy DOFs
    //    $.each(budgetObj.DOFs, function (idx, dof) {

    //        var srcDofId = dof.DOF_ID;

    //        self.CopyDOF(dof, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {
    //            // Copy DOF's lines - aren't any to copy
    //            //var srcLines = $.grep(budgetObj.DOFLines, function (line) {
    //            //    return StrEq(line.DOF_ID, srcDofId);
    //            //});

    //            //$.each(srcLines, function (idx, line) {
    //            //    self.CopyCashflowLine(line, dof.DOF_ID, isSameYear);
    //            //});
    //        }
    //    });

    //};

    //ApiClient.prototype.CopyDOF = function (dof, newBudgetDateId, isSameYear) {

    //    dof.DOF_ID = GenerateGuid(); // Assign new id
    //    dof.DOF_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    dof.ModifiedData = true;

    //};

    // #endregion

    // #region Copy Other Crop Reconcils

    //ApiClient.prototype.CopyOtherCropRecons = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy headers
    //    $.each(budgetObj.OtherCropReconHeaders, function (idx, header) {

    //        var srcHeaderId = header.OtherCropRecon_Header_ID;

    //        self.CopyOtherCropReconHeader(header, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {
    //            // Copy header's lines
    //            var srcLines = $.grep(budgetObj.OtherCropReconLines, function (line) {
    //                return StrEq(line.OtherCropReconcil_Header_ID, srcHeaderId);
    //            });

    //            $.each(srcLines, function (idx, line) {
    //                self.CopyOtherCropReconLine(line, header.OtherCropRecon_Header_ID, isSameYear);
    //            });
    //        }
    //    });

    //};

    //ApiClient.prototype.CopyOtherCropReconHeader = function (header, newBudgetDateId, isSameYear) {

    //    header.OtherCropRecon_Header_ID = GenerateGuid(); // Assign new id
    //    header.OtherCropRecon_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    header.ModifiedData = true;

    //};

    //ApiClient.prototype.CopyOtherCropReconLine = function (line, newHeaderId, isSameYear) {

    //    delete line.ModifiedData;

    //    line.OtherCropReconcil_Line_ID = GenerateGuid(); // Assign new id
    //    line.OtherCropReconcil_Header_ID = newHeaderId; // Tie to the new header copy
    //    line.ModifiedData = true;
    //};

    // #endregion

    // #region Copy Other Livestock Calendars

    //ApiClient.prototype.CopyOtherLivestockCals = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy headers
    //    $.each(budgetObj.OtherLivestockCalHeaders, function (idx, header) {

    //        var srcHeaderId = header.OtherLivestock_Header_ID;

    //        self.CopyOtherLivestockCalHeader(header, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {
    //            // Copy header's lines
    //            var srcLines = $.grep(budgetObj.OtherLivestockCalLines, function (line) {
    //                return StrEq(line.OtherLivestockCalendar_Header_ID, srcHeaderId);
    //            });

    //            $.each(srcLines, function (idx, line) {
    //                self.CopyOtherLivestockCalLine(line, header.OtherLivestock_Header_ID, isSameYear);
    //            });
    //        }
    //    });

    //};

    //ApiClient.prototype.CopyOtherLivestockCalHeader = function (header, newBudgetDateId, isSameYear) {

    //    header.OtherLivestock_Header_ID = GenerateGuid(); // Assign new id
    //    header.OtherLivestock_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    header.ModifiedData = true;

    //};

    //ApiClient.prototype.CopyOtherLivestockCalLine = function (line, newHeaderId, isSameYear) {

    //    delete line.ModifiedData;

    //    line.OtherLivestockCalendar_Line_ID = GenerateGuid(); // Assign new id
    //    line.OtherLivestockCalendar_Header_ID = newHeaderId; // Tie to the new header copy
    //    line.ModifiedData = true;
    //};

    // #endregion

    // #region Copy Other Rearing Calendars

    //ApiClient.prototype.CopyOtherRearingCals = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy headers
    //    $.each(budgetObj.OtherRearingCalHeaders, function (idx, header) {

    //        var srcHeaderId = header.OtherRearing_Header_ID;

    //        self.CopyOtherRearingCalHeader(header, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {
    //            // Copy header's lines
    //            var srcLines = $.grep(budgetObj.OtherRearingCalLines, function (line) {
    //                return StrEq(line.OtherRearingCalendar_Header_ID, srcHeaderId);
    //            });

    //            $.each(srcLines, function (idx, line) {
    //                self.CopyOtherRearingCalLine(line, header.OtherRearing_Header_ID, isSameYear);
    //            });
    //        }
    //    });

    //};

    //ApiClient.prototype.CopyOtherRearingCalHeader = function (header, newBudgetDateId, isSameYear) {

    //    header.OtherRearing_Header_ID = GenerateGuid(); // Assign new id
    //    header.OtherRearing_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    header.ModifiedData = true;

    //};

    //ApiClient.prototype.CopyOtherRearingCalLine = function (line, newHeaderId, isSameYear) {

    //    delete line.ModifiedData;

    //    line.OtherRearingCalendar_Line_ID = GenerateGuid(); // Assign new id
    //    line.OtherRearingCalendar_Header_ID = newHeaderId; // Tie to the new header copy
    //    line.ModifiedData = true;
    //};

    // #endregion

    // #region Copy Subsidies

    //ApiClient.prototype.CopySubsidies = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy headers
    //    $.each(budgetObj.SubsidiesHeaders, function (idx, header) {

    //        var srcHeaderId = header.Subsidies_Header_ID;

    //        self.CopySubsidiesHeader(header, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {
    //            // Copy header's lines
    //            var srcLines = $.grep(budgetObj.SubsidiesLines, function (line) {
    //                return StrEq(line.Subsidies_Lines_HeaderID, srcHeaderId);
    //            });

    //            $.each(srcLines, function (idx, line) {
    //                self.CopySubsidiesLine(line, header.Subsidies_Header_ID, isSameYear);
    //            });
    //        }
    //    });

    //};

    //ApiClient.prototype.CopySubsidiesHeader = function (header, newBudgetDateId, isSameYear) {

    //    header.Subsidies_Header_ID = GenerateGuid(); // Assign new id
    //    header.Subsidies_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    header.ModifiedData = true;

    //};

    //ApiClient.prototype.CopySubsidiesLine = function (line, newHeaderId, isSameYear) {

    //    delete line.ModifiedData;

    //    line.Subsidies_Lines_ID = GenerateGuid(); // Assign new id
    //    line.Subsidies_Lines_HeaderID = newHeaderId; // Tie to the new header copy
    //    line.ModifiedData = true;
    //};

    // #endregion

    // #region Copy Suckler Cow Calendars

    //ApiClient.prototype.CopySucklerCowCals = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy headers
    //    $.each(budgetObj.SucklerCowCalHeaders, function (idx, header) {

    //        var srcHeaderId = header.SucklerCows_Header_ID;

    //        self.CopySucklerCowCalHeader(header, newBudgetDateId, isSameYear);

    //        if (header.ModifiedData) {
    //            // Copy header's lines
    //            var srcLines = $.grep(budgetObj.SucklerCowCalLines, function (line) {
    //                return StrEq(line.SucklerCowsCalendar_Header_ID, srcHeaderId);
    //            });

    //            $.each(srcLines, function (idx, line) {
    //                self.CopySucklerCowCalLine(line, header.SucklerCows_Header_ID, isSameYear);
    //            });
    //        }
    //    });

    //};

    //ApiClient.prototype.CopySucklerCowCalHeader = function (header, newBudgetDateId, isSameYear) {

    //    header.SucklerCows_Header_ID = GenerateGuid(); // Assign new id
    //    header.SucklerCows_Header_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    header.ModifiedData = true;

    //};

    //ApiClient.prototype.CopySucklerCowCalLine = function (line, newHeaderId, isSameYear) {

    //    delete line.ModifiedData;

    //    line.SucklerCowsCalendar_Line_ID = GenerateGuid(); // Assign new id
    //    line.SucklerCowsCalendar_Header_ID = newHeaderId; // Tie to the new header copy
    //    line.ModifiedData = true;
    //};

    // #endregion

    // #region Copy Trading Summaries

    //ApiClient.prototype.CopyTradingSummaries = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy Trading Summaries
    //    $.each(budgetObj.TradingSummaries, function (idx, tradingSummary) {

    //        var srcTradingSummaryId = tradingSummary.TradingSummary_ID;

    //        self.CopyTradingSummary(tradingSummary, newBudgetDateId, isSameYear);

    //    });

    //};

    //ApiClient.prototype.CopyTradingSummary = function (tradingSummary, newBudgetDateId, isSameYear) {

    //    tradingSummary.TradingSummary_ID = GenerateGuid(); // Assign new id
    //    tradingSummary.TradingSummary_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    tradingSummary.ModifiedData = true;

    //};

    // #endregion

    // #region Copy Transfers

    //ApiClient.prototype.CopyTransfers = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy Transfers
    //    $.each(budgetObj.Transfers, function (idx, transfer) {

    //        var srcTransferId = transfer.Transfer_ID;

    //        self.CopyTransfer(transfer, newBudgetDateId, isSameYear);

    //    });

    //};

    //ApiClient.prototype.CopyTransfer = function (transfer, newBudgetDateId, isSameYear) {

    //    transfer.Transfer_ID = GenerateGuid(); // Assign new id
    //    transfer.Transfer_YearEnd = newBudgetDateId; // Tie to the new budget copy
    //    transfer.ModifiedData = true;

    //};

    // #endregion

    // #region Copy WFNP Imports

    //ApiClient.prototype.CopyWfnpImports = function (budgetObj, newBudgetDateId, isSameYear) {

    //    var self = this;

    //    // Copy WFNP Imports
    //    $.each(budgetObj.WfnpImports, function (idx, wfnpImport) {

    //        var srcWfnpImportId = wfnpImport.WFNPImport_ID;

    //        self.CopyWfnpImport(wfnpImport, newBudgetDateId, isSameYear);

    //    });

    //};

    //ApiClient.prototype.CopyWfnpImport = function (wfnpImport, newBudgetDateId, isSameYear) {

    //    wfnpImport.WFNPImport_ID = GenerateGuid(); // Assign new id
    //    wfnpImport.WFNPImport_BudgetDate_ID = newBudgetDateId; // Tie to the new budget copy
    //    wfnpImport.ModifiedData = true;

    //};

    // #endregion Copying

    // #endregion

    // #region Fetching

    /**
     * FetchBudget Gets a BudgetDate and its child and grandchild tables from IndexedDB.
     * @param {string} budgetDateId The ID (GUID) of the Budget Date to fetch.
     * @param {bool} [resolveEmptyBudgetDateId] Flag specifying whether to resolve immediately if budgetDateId is empty. If false or not specified, the deferred is rejected.
     * @returns {JQueryPromise} Returns a promise that is resolved when the async operation completes.
     */
    ApiClient.prototype.FetchBudget = function (budgetDateId, resolveEmptyBudgetDateId) {

        var self = this;
        var deferred = $.Deferred();

        if (StringIsNullOrEmpty(budgetDateId) && resolveEmptyBudgetDateId) {
            // Resolve immediately if specified id is empty and ok to do so
            deferred.resolve(null);
            return deferred.promise();
        }

        // Start querying for the BudgetDate and its child tables
        var defBudgetDate = self.DbQrySvc.QueryDeferred(DBName, tblBudgetDate, function filter(bd) { return StringEquals(bd.BudgetDate_ID, budgetDateId) && NotSoftDeleted(bd.BudgetDate_Deleted); }, self.TransformDeleteModifiedData, null, true);
        var defArableCropReconcilHeaders = self.DbQrySvc.QueryDeferred(DBName, tblArableCropReconcilHeader, function (acrh) { return StringEquals(acrh.ArableCropRecon_YearEnd, budgetDateId) && NotSoftDeleted(acrh.ArableCropRecon_Deleted); }, self.TransformDeleteModifiedData);
        var defBeefRearingCalHeaders = self.DbQrySvc.QueryDeferred(DBName, tblBeefRearingCalHeader, function (brch) { return StringEquals(brch.BeefRearing_Header_YearEnd, budgetDateId) && NotSoftDeleted(brch.BeefRearing_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defBreedingEweCalHeaders = self.DbQrySvc.QueryDeferred(DBName, tblBreedingEweCalHeader, function (bech) { return StringEquals(bech.BreedingEwes_Header_YearEnd, budgetDateId) && NotSoftDeleted(bech.BreedingEwes_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defCapexHeaders = self.DbQrySvc.QueryDeferred(DBName, tblCapexHeader, function (ch) { return StringEquals(ch.Capex_Header_YearEnd, budgetDateId) && NotSoftDeleted(ch.Capex_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defCashflowHeaders = self.DbQrySvc.QueryDeferred(DBName, tblCashflowHeader, function (ch) { return StringEquals(ch.Cashflow_Header_YearEnd, budgetDateId) && NotSoftDeleted(ch.Cashflow_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defCropSchedules = self.DbQrySvc.QueryDeferred(DBName, tblCropSchedule, function (cs) { return StringEquals(cs.CropSchedule_YearEnd, budgetDateId) && NotSoftDeleted(cs.CropSchedule_Deleted); }, self.TransformDeleteModifiedData);
        var defDairyHerdCalHeaders = self.DbQrySvc.QueryDeferred(DBName, tblDairyHerdCalHeader, function (dhch) { return StringEquals(dhch.DairyHerdCal_Header_YearEnd, budgetDateId) && NotSoftDeleted(dhch.DairyHerdCal_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defDairyYoungstockCalHeaders = self.DbQrySvc.QueryDeferred(DBName, tblDairyYoungstockCalHeader, function (dych) { return StringEquals(dych.DairyYoungstockCal_Header_YearEnd, budgetDateId) && NotSoftDeleted(dych.DairyYoungstockCal_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defDOFs = self.DbQrySvc.QueryDeferred(DBName, tblDOF, function (d) { return StringEquals(d.DOF_YearEnd, budgetDateId) && NotSoftDeleted(d.DOF_Deleted); }, self.TransformDeleteModifiedData);
        var defGrossMargins = self.DbQrySvc.QueryDeferred(DBName, tblGrossMargin, function (gm) { return StringEquals(gm.GrossMargin_YearEnd, budgetDateId) && NotSoftDeleted(gm.GrossMargin_Deleted); }, self.TransformDeleteModifiedData);
        var defLoanScheduleHeaders = self.DbQrySvc.QueryDeferred(DBName, tblLoanScheduleHeader, function (lsh) { return StringEquals(lsh.LoanSchedules_Header_YearEnd, budgetDateId) && NotSoftDeleted(lsh.LoanSchedules_Header_Deleted); }, self.TransformDeleteModifiedData);
        //var defOtherCropReconHeaders = self.DbQrySvc.QueryDeferred(DBName, tblOtherCropReconHeader, function (ocrh) { return StrEq(ocrh.OtherCropRecon_YearEnd, budgetDateId) && NotSoftDeleted(ocrh.OtherCropRecon_Deleted); }, self.TransformDeleteModifiedData);
        //var defOtherLivestockCalHeaders = self.DbQrySvc.QueryDeferred(DBName, tblOtherLivestockCalHeader, function (olh) { return StrEq(olh.OtherLivestock_Header_YearEnd, budgetDateId) && NotSoftDeleted(olh.OtherLivestock_Header_Deleted); }, self.TransformDeleteModifiedData);
        //var defOtherRearingCalHeaders = self.DbQrySvc.QueryDeferred(DBName, tblOtherRearingCalHeader, function (orh) { return StrEq(orh.OtherRearing_Header_YearEnd, budgetDateId) && NotSoftDeleted(orh.OtherRearing_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defOverheadCosts = self.DbQrySvc.QueryDeferred(DBName, tblOverheadCost, function (oc) { return StringEquals(oc.OverheadCosts_YearEnd, budgetDateId) && NotSoftDeleted(oc.OverheadCosts_Deleted); }, self.TransformDeleteModifiedData);
        var defRentScheduleHeaders = self.DbQrySvc.QueryDeferred(DBName, tblRentScheduleHeader, function (rsh) { return StringEquals(rsh.RentSchedules_Header_YearEnd, budgetDateId) && NotSoftDeleted(rsh.RentSchedules_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defSubsidiesHeaders = self.DbQrySvc.QueryDeferred(DBName, tblSubsidiesHeader, function (sh) { return StringEquals(sh.Subsidies_Header_YearEnd, budgetDateId) && NotSoftDeleted(sh.Subsidies_Header_Deleted); }, self.TransformDeleteModifiedData);
        var defSucklerCowCalHeaders = self.DbQrySvc.QueryDeferred(DBName, tblSucklerCowCalHeader, function (scch) { return StringEquals(scch.SucklerCows_Header_YearEnd, budgetDateId) && NotSoftDeleted(scch.SucklerCows_Header_Deleted); }, self.TransformDeleteModifiedData);
        //var defTradingSummaries = self.DbQrySvc.QueryDeferred(DBName, tblTradingSummary, function (ts) { return StrEq(ts.TradingSummary_YearEnd, budgetDateId) && NotSoftDeleted(ts.TradingSummary_Deleted); }, self.TransformDeleteModifiedData);
        var defTransfers = self.DbQrySvc.QueryDeferred(DBName, tblTransfer, function (t) { return StringEquals(t.Transfer_YearEnd, budgetDateId) && NotSoftDeleted(t.Transfer_Deleted); }, self.TransformDeleteModifiedData);
        //var defWfnpImports = self.DbQrySvc.QueryDeferred(DBName, tblWfnpImport, function (wi) { return StrEq(wi.WFNPImport_BudgetDate_ID, budgetDateId) && NotSoftDeleted(wi.WFNPImport_Deleted); }, self.TransformDeleteModifiedData);
        var defEnterpriseMasters = self.DbQrySvc.QueryDeferred(DBName, tblEnterpriseMaster, function (em) { return NotSoftDeleted(em.Enterprise_Deleted); });
        var defBalanceSheets = self.DbQrySvc.QueryDeferred(DBName, tblBalanceSheet, function (bs) { return StringEquals(bs.BalanceSheet_YearEnd, budgetDateId) && NotSoftDeleted(bs.BalanceSheet_Deleted); }, self.TransformDeleteModifiedData);

        // Wait for all queries to complete
        $.when(defBudgetDate, defArableCropReconcilHeaders, defBeefRearingCalHeaders, defBreedingEweCalHeaders, defCapexHeaders,
            defCashflowHeaders, defCropSchedules, defDairyHerdCalHeaders, defDairyYoungstockCalHeaders, defDOFs,
            defGrossMargins, defLoanScheduleHeaders, /*defOtherCropReconHeaders,*/ /*defOtherLivestockCalHeaders,*/ /*defOtherRearingCalHeaders,*/
            defOverheadCosts, defRentScheduleHeaders, defSubsidiesHeaders,
            defSucklerCowCalHeaders/*, defTradingSummaries*/, defTransfers /*, defWfnpImports*/, defEnterpriseMasters, defBalanceSheets)
            .done(function (budgetDate, arableCropReconcilHeaders, beefRearingCalHeaders, breedingEweCalHeaders, capexHeaders,
                cashflowHeaders, cropSchedules, dairyHerdCalHeaders, dairyYoungstockCalHeaders, dOFs,
                grossMargins, loanScheduleHeaders, /*otherCropReconHeaders,*/ /*otherLivestockCalHeaders,*/ /*otherRearingCalHeaders,*/
                overheadCosts, rentScheduleHeaders, subsidiesHeaders,
                sucklerCowCalHeaders/*, tradingSummaries*/, transfers /*, wfnpImports*/, enterpriseMasters, balanceSheets) {

                if (budgetDate) {

                    // Put the BudgetDate and its associated tables into a single object
                    var budgetObj = {};

                    budgetObj.BudgetDate = budgetDate;
                    budgetObj.ArableCropReconcilHeaders = arableCropReconcilHeaders;
                    budgetObj.BeefRearingCalHeaders = beefRearingCalHeaders;
                    budgetObj.BreedingEweCalHeaders = breedingEweCalHeaders;
                    budgetObj.CapexHeaders = capexHeaders;
                    budgetObj.CashflowHeaders = cashflowHeaders;
                    budgetObj.CropSchedules = cropSchedules; // Needed for Overhead Costs comparative column calculations
                    budgetObj.DairyHerdCalHeaders = dairyHerdCalHeaders;
                    budgetObj.DairyYoungstockCalHeaders = dairyYoungstockCalHeaders;
                    budgetObj.DOFs = dOFs;
                    budgetObj.GrossMargins = grossMargins;
                    budgetObj.LoanScheduleHeaders = loanScheduleHeaders;
                    //budgetObj.OtherCropReconHeaders = otherCropReconHeaders;
                    //budgetObj.OtherLivestockCalHeaders = otherLivestockCalHeaders;
                    //budgetObj.OtherRearingCalHeaders = otherRearingCalHeaders;
                    budgetObj.OverheadCosts = overheadCosts;
                    budgetObj.RentScheduleHeaders = rentScheduleHeaders;
                    budgetObj.SubsidiesHeaders = subsidiesHeaders;
                    budgetObj.SucklerCowCalHeaders = sucklerCowCalHeaders;
                    //budgetObj.TradingSummaries = tradingSummaries;
                    budgetObj.Transfers = transfers;
                    //budgetObj.WfnpImports = wfnpImports;
                    budgetObj.BalanceSheets = balanceSheets;

                    // Now get grandchildren
                    self.FetchBudgetGrandchildren(arableCropReconcilHeaders, beefRearingCalHeaders, breedingEweCalHeaders, capexHeaders, cashflowHeaders,
                        dairyHerdCalHeaders, dairyYoungstockCalHeaders, loanScheduleHeaders, /*otherCropReconHeaders,*/ /*otherLivestockCalHeaders,*/
                        /*otherRearingCalHeaders,*/ rentScheduleHeaders, subsidiesHeaders, sucklerCowCalHeaders, budgetDate.BudgetDate_Customer_ID, budgetDate.BudgetDate_ID, enterpriseMasters)

                        .done(function (arableCropReconcilLines, beefRearingCalLines, breedingEweCalLines, capexLines, cashflowLines,
                            dairyHerdCalLines, dairyYoungstockCalLines, loanScheduleLines, /*otherCropReconLines,*/ /*otherLivestockCalLines,*/
                            /*otherRearingCalLines,*/ rentScheduleLines, subsidiesLines, sucklerCowCalLines, enterpriseToCustomers) {

                            // Tack the grandchildren onto the budget object to be returned
                            budgetObj.ArableCropReconcilLines = arableCropReconcilLines;
                            budgetObj.BeefRearingCalLines = beefRearingCalLines;
                            budgetObj.BreedingEweCalLines = breedingEweCalLines;
                            budgetObj.CapexLines = capexLines;
                            budgetObj.CashflowLines = cashflowLines;
                            budgetObj.DairyHerdCalLines = dairyHerdCalLines;
                            budgetObj.DairyYoungstockCalLines = dairyYoungstockCalLines;
                            budgetObj.LoanScheduleLines = loanScheduleLines;
                            //budgetObj.OtherCropReconLines = otherCropReconLines;
                            //budgetObj.OtherLivestockCalLines = otherLivestockCalLines;
                            //budgetObj.OtherRearingCalLines = otherRearingCalLines;
                            budgetObj.RentScheduleLines = rentScheduleLines;
                            budgetObj.SubsidiesLines = subsidiesLines;
                            budgetObj.SucklerCowCalLines = sucklerCowCalLines;
                            budgetObj.EnterpriseToCustomers = enterpriseToCustomers;

                            deferred.resolve(budgetObj);
                        })
                        .fail(function () {

                            deferred.reject("Error fetching BudgetDate grandchild data");
                        });

                }
                else {
                    deferred.reject("Cannot find a BudgetDate with id " + budgetDateId);
                }
            })
            .fail(function () {

                deferred.reject("Error fetching BudgetDate data");
            });

        return deferred.promise();
    };

    /**
     * FetchBudgetGrandchildren : Gets the child table data that hangs off the BudgetDate table from IndexedDB
     * @param arableCropReconcilHeaders : The Arable Crop Headers whose children we want
     */
    ApiClient.prototype.FetchBudgetGrandchildren = function (arableCropReconcilHeaders, beefRearingCalHeaders, breedingEweCalHeaders, capexHeaders, cashflowHeaders,
        dairyHerdCalHeaders, dairyYoungstockCalHeaders, loanScheduleHeaders, /*otherCropReconHeaders,*/ /*otherLivestockCalHeaders,*/
        /*otherRearingCalHeaders,*/ rentScheduleHeaders, subsidiesHeaders, sucklerCowCalHeaders, customerId, budgetDateId, enterpriseMasters) {

        var self = this;
        var deferred = $.Deferred();

        // Start querying for grandchildren records
        var defArableCropReconcilLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblArableCropReconcilLine, function filter(acrl) { return NotSoftDeleted(acrl.ArableCropReconcil_Line_Deleted); }, self.TransformDeleteModifiedData, null, arableCropReconcilHeaders, "ArableCropReconcil_Header_ID", "ArableCropRecon_Header_ID");
        var defBeefRearingCalLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblBeefRearingCalLine, function filter(brcl) { return NotSoftDeleted(brcl.BeefRearingCalendar_Line_Deleted); }, self.TransformDeleteModifiedData, null, beefRearingCalHeaders, "BeefRearingCalendar_Header_ID", "BeefRearing_Header_ID");
        var defBreedingEweCalLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblBreedingEweCalLine, function filter(becl) { return NotSoftDeleted(becl.BreedingEwesCalendar_Line_Deleted); }, self.TransformDeleteModifiedData, null, breedingEweCalHeaders, "BreedingEwesCalendar_Header_ID", "BreedingEwes_Header_ID");
        var defCapexLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblCapexLine, function filter(cl) { return NotSoftDeleted(cl.Capex_Line_Deleted); }, self.TransformDeleteModifiedData, null, capexHeaders, "Capex_Header_ID", "Capex_Header_ID");
        var defCashflowLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblCashflowLine, function filter(cl) { return NotSoftDeleted(cl.Cashflow_Line_Deleted); }, self.TransformDeleteModifiedData, null, cashflowHeaders, "Cashflow_Header_ID", "Cashflow_Header_ID");
        var defDairyHerdCalLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblDairyHerdCalLine, function filter(dhcl) { return NotSoftDeleted(dhcl.DairyHerdCalendar_Line_Deleted); }, self.TransformDeleteModifiedData, null, dairyHerdCalHeaders, "DairyHerdCalendar_Header_ID", "DairyHerdCal_Header_ID");
        var defDairyYoungstockCalLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblDairyYoungstockCalLine, function filter(dycl) { return NotSoftDeleted(dycl.DairyYoungstockCalendar_Line_Deleted); }, self.TransformDeleteModifiedData, null, dairyYoungstockCalHeaders, "DairyYoungstockCalendar_Header_ID", "DairyYoungstockCal_Header_ID");
        var defLoanScheduleLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblLoanSchedulesLine, function filter(lsl) { return NotSoftDeleted(lsl.LoanSchedules_Line_Deleted); }, self.TransformDeleteModifiedData, null, loanScheduleHeaders, "LoanSchedules_Header_ID", "LoanSchedules_Header_ID");
        //var defOtherCropReconLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblOtherCropReconLine, function filter(ocrl) { return NotSoftDeleted(ocrl.OtherCropReconcil_Line_Deleted); }, self.TransformDeleteModifiedData, null, otherCropReconHeaders, "OtherCropReconcil_Header_ID", "OtherCropRecon_Header_ID");
        //var defOtherLivestockCalLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblOtherLivestockCalLine, function filter(olcl) { return NotSoftDeleted(olcl.OtherLivestockCalendar_Line_Deleted); }, self.TransformDeleteModifiedData, null, otherLivestockCalHeaders, "OtherLivestockCalendar_Header_ID", "OtherLivestock_Header_ID");
        //var defOtherRearingCalLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblOtherRearingCalLine, function filter(orcl) { return NotSoftDeleted(orcl.OtherRearingCalendar_Line_Deleted); }, self.TransformDeleteModifiedData, null, otherRearingCalHeaders, "OtherRearingCalendar_Header_ID", "OtherRearing_Header_ID");
        var defRentScheduleLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblRentScheduleLine, function filter(rsl) { return NotSoftDeleted(rsl.RentSchedules_Line_Deleted); }, self.TransformDeleteModifiedData, null, rentScheduleHeaders, "RentSchedules_Header_ID", "RentSchedules_Header_ID");
        var defSubsidiesLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblSubsidiesLine, function filter(sl) { return NotSoftDeleted(sl.Subsidies_Lines_Deleted); }, self.TransformDeleteModifiedData, null, subsidiesHeaders, "Subsidies_Lines_HeaderID", "Subsidies_Header_ID");
        var defSucklerCowCalLines = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblSucklerCowCalLine, function filter(sccl) { return NotSoftDeleted(sccl.SucklerCowsCalendar_Line_Deleted); }, self.TransformDeleteModifiedData, null, sucklerCowCalHeaders, "SucklerCowsCalendar_Header_ID", "SucklerCows_Header_ID");

        var defEnterpriseToCustomers = self.DbQrySvc.QueryInnerJoinDeferred(DBName, tblEnterpriseToCustomer, function (e2c) {
            return StringEquals(e2c.Enter_Custo_YearEnd, budgetDateId)
                && StringEquals(e2c.Enter_Custo_CustomerID, customerId)
                && NotSoftDeleted(e2c.Enter_Custom_IsDeleted);
        }, null, "Enterprise_Name", enterpriseMasters, "Enter_Custo_EnterpriseID", "Enterprise_ID");

        // Wait for all queries to complete
        $.when(defArableCropReconcilLines, defBeefRearingCalLines, defBreedingEweCalLines, defCapexLines, defCashflowLines,
            defDairyHerdCalLines, defDairyYoungstockCalLines, defLoanScheduleLines, /*defOtherCropReconLines,*/ /*defOtherLivestockCalLines,*/
            /*defOtherRearingCalLines,*/ defRentScheduleLines, defSubsidiesLines, defSucklerCowCalLines, defEnterpriseToCustomers)

            .done(function (arableCropReconcilLines, beefRearingCalLines, breedingEweCalLines, capexLines, cashflowLines,
                dairyHerdCalLines, dairyYoungstockCalLines, loanScheduleLines, /*otherCropReconLines,*/ /*otherLivestockCalLines,*/
                /*otherRearingCalLines,*/ rentScheduleLines, subsidiesLines, sucklerCowCalLines, enterpriseToCustomers) {

                // Return the grandchildren to the waiting caller
                deferred.resolve(arableCropReconcilLines, beefRearingCalLines, breedingEweCalLines, capexLines, cashflowLines,
                    dairyHerdCalLines, dairyYoungstockCalLines, loanScheduleLines, /*otherCropReconLines,*/ /*otherLivestockCalLines,*/
                    /*otherRearingCalLines,*/ rentScheduleLines, subsidiesLines, sucklerCowCalLines, enterpriseToCustomers);
            });

        return deferred.promise();
    };

    /**
     * TransformDeleteModifiedData Deletes the ModifiedData property of the given dbItem.
     * @param {any} dbItem The database record whose ModifiedData property is to be deleted.
     * @returns {any} The modified dbItem.
     */
    ApiClient.prototype.TransformDeleteModifiedData = function (dbItem) {

        delete dbItem.ModifiedData;

        return dbItem;
    };

    /**
    Gets the BudgetDates for the specified Customer ID and optional Budget Type.
    @param {string} customerId ID of the Customer whose Budgets are wanted.
    */
    ApiClient.prototype.FetchCustomerBudgetDates = function (customerId) {

        return this.DbQrySvc.QueryDeferred(
            DBName,
            tblBudgetDate,
            function filter(bd) {
                return StringEquals(bd.BudgetDate_Customer_ID, customerId)
                    && NotSoftDeleted(bd.BudgetDate_Deleted);
            },
            function transform(bd) {
                // Ensure real JS date and remove possible time component set via local timezone
                bd.BudgetDate_Date = RemoveTime(bd.BudgetDate_Date);
                return bd;
            },
            [["BudgetDate_Date", true], "BudgetDate_VersionNo"]);
    };

    // #endregion

    // #region Saving

    ApiClient.prototype.SaveCopiedBudget = function (budgetObj) {

        var self = this;
        var deferred = $.Deferred();

        // Get just the modified items
        var arableCropReconcilHeaders = self.FilterModified(budgetObj.ArableCropReconcilHeaders);
        var beefRearingCalHeaders = self.FilterModified(budgetObj.BeefRearingCalHeaders);
        var breedingEweCalHeaders = self.FilterModified(budgetObj.BreedingEweCalHeaders);
        var capexHeaders = self.FilterModified(budgetObj.CapexHeaders);
        //var cashflowHeaders = self.FilterModified(budgetObj.CashflowHeaders);
        //var cropSchedules = self.FilterModified(budgetObj.CropSchedules);
        //var dairyHerdCalHeaders = self.FilterModified(budgetObj.DairyHerdCalHeaders);
        var dairyYoungstockCalHeaders = self.FilterModified(budgetObj.DairyYoungstockCalHeaders);
        //var dOFs = self.FilterModified(budgetObj.DOFs);
        var grossMargins = self.FilterModified(budgetObj.GrossMargins);
        var loanScheduleHeaders = self.FilterModified(budgetObj.LoanScheduleHeaders);
        //var otherCropReconHeaders = self.FilterModified(budgetObj.OtherCropReconHeaders);
        //var otherLivestockCalHeaders = self.FilterModified(budgetObj.OtherLivestockCalHeaders);
        //var otherRearingCalHeaders = self.FilterModified(budgetObj.OtherRearingCalHeaders);
        var overheadCosts = self.FilterModified(budgetObj.OverheadCosts);
        var rentScheduleHeaders = self.FilterModified(budgetObj.RentScheduleHeaders);
        //var subsidiesHeaders = self.FilterModified(budgetObj.SubsidiesHeaders);
        //var sucklerCowCalHeaders = self.FilterModified(budgetObj.SucklerCowCalHeaders);
        //var tradingSummaries = self.FilterModified(budgetObj.TradingSummaries);
        //var transfers = self.FilterModified(budgetObj.Transfers);
        //var wfnpImports = self.FilterModified(budgetObj.WfnpImports);
        var arableCropReconcilLines = self.FilterModified(budgetObj.ArableCropReconcilLines);
        var beefRearingCalLines = self.FilterModified(budgetObj.BeefRearingCalLines);
        var breedingEweCalLines = self.FilterModified(budgetObj.BreedingEweCalLines);
        var capexLines = self.FilterModified(budgetObj.CapexLines);
        //var cashflowLines = self.FilterModified(budgetObj.CashflowLines);
        //var dairyHerdCalLines = self.FilterModified(budgetObj.DairyHerdCalLines);
        var dairyYoungstockCalLines = self.FilterModified(budgetObj.DairyYoungstockCalLines);
        var loanScheduleLines = self.FilterModified(budgetObj.LoanScheduleLines);
        //var otherCropReconLines = self.FilterModified(budgetObj.OtherCropReconLines);
        //var otherLivestockCalLines = self.FilterModified(budgetObj.OtherLivestockCalLines);
        //var otherRearingCalLines = self.FilterModified(budgetObj.OtherRearingCalLines);
        var rentScheduleLines = self.FilterModified(budgetObj.RentScheduleLines);
        //var subsidiesLines = self.FilterModified(budgetObj.SubsidiesLines);
        //var sucklerCowCalLines = self.FilterModified(budgetObj.SucklerCowCalLines);
        var enterpriseToCustomers = self.FilterModified(budgetObj.EnterpriseToCustomers);

        // Start storing the modified items
        var savePromises = [];

        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblBudgetDate, budgetObj.BudgetDate));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblArableCropReconcilHeader, arableCropReconcilHeaders));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblBeefRearingCalHeader, beefRearingCalHeaders));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblBreedingEweCalHeader, breedingEweCalHeaders));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblCapexHeader, capexHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblCashflowHeader, cashflowHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblCropSchedule, cropSchedules));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblDairyHerdCalHeader, dairyHerdCalHeaders));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblDairyYoungstockCalHeader, dairyYoungstockCalHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblDOF, dOFs));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblGrossMargin, grossMargins));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblLoanScheduleHeader, loanScheduleHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblOtherCropReconHeader, otherCropReconHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblOtherLivestockCalHeader, otherLivestockCalHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblOtherRearingCalHeader, otherRearingCalHeaders));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblOverheadCost, overheadCosts));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblRentScheduleHeader, rentScheduleHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblSubsidiesHeader, subsidiesHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblSucklerCowCalHeader, sucklerCowCalHeaders));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblTradingSummary, tradingSummaries));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblTransfer, transfers));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblWfnpImport, wfnpImports));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblArableCropReconcilLine, arableCropReconcilLines));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblBeefRearingCalLine, beefRearingCalLines));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblBreedingEweCalLine, breedingEweCalLines));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblCapexLine, capexLines));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblCashflowLine, cashflowLines));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblDairyHerdCalLine, dairyHerdCalLines));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblDairyYoungstockCalLine, dairyYoungstockCalLines));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblLoanSchedulesLine, loanScheduleLines));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblOtherCropReconLine, otherCropReconLines));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblOtherLivestockCalLine, otherLivestockCalLines));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblOtherRearingCalLine, otherRearingCalLines));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblRentScheduleLine, rentScheduleLines));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblSubsidiesLine, subsidiesLines));
        //savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblSucklerCowCalLine, sucklerCowCalLines));
        savePromises.push(self.DbQrySvc.StoreDeferred(DBName, tblEnterpriseToCustomer, enterpriseToCustomers));

        // Wait for all store operations to finish
        $.when.apply($, savePromises)
            .done(function () {
                // Storing succeeded
                deferred.resolve();
            })
            .fail(function (failReason) {
                // Storing failed
                deferred.reject(failReason);
            });

        return deferred.promise();
    };

    /** CheckVersion Check if a BudgetDate with the given Year End Date and Version No already exists.
    @param {string} customerId Id (guid) of the customer.
    @param {Date} yearEndDate Year end date.
    @param {number} versionNo Version number.
    @param {string} [idToIgnore] Optional Budget Date ID (guid) to ignore. i.e. use this when an existing Budget is about to be saved and we want to see if there are any others with the same date and version.
    @return {JQueryPromise<Boolean>} A promise that is resolved with a true/false flag when the async operation completes.
    */
    ApiClient.prototype.DoesVersionExist = function (customerId, yearEndDate, versionNo, idToIgnore) {

        var self = this;
        var deferred = $.Deferred();

        self.DbQrySvc.QueryDeferred(DBName, tblBudgetDate, function filter(bd) {

            return StringEquals(bd.BudgetDate_Customer_ID, customerId)
                && AreDatesEqual(bd.BudgetDate_Date, yearEndDate)
                && StringEquals(bd.BudgetDate_VersionNo, versionNo)
                && (StringIsNullOrEmpty(idToIgnore) || !StringEquals(bd.BudgetDate_ID, idToIgnore));
        })
            .done(function (budgetDates) {
                var versionExists = budgetDates.length > 0;
                deferred.resolve(versionExists);
            })
            .fail(function (failReason) {
                deferred.reject(failReason);
            });

        return deferred.promise();
    };

    /**
    * Updates the specified BudgetDate's WorkflowStatus.
    * @param {string} budgetDateId The id (guid) of the BudgetDate to update.
    * @param {number} newWorkflowStatusId The id of the BudgetWorkflowStatus to change to.
    * @returns {JQueryPromise} Returns a promise that is resolved when the async operation completes.
    */
    ApiClient.prototype.UpdateWorkflowStatus = function (budgetDateId, newWorkflowStatusId) {

        var self = this;
        var deferred = $.Deferred();

        // Update the budget's work-flow status
        var updateObj = {
            BudgetDate_WorkflowStatusId: newWorkflowStatusId,
            ModifiedData: true
        };

        self.DbQrySvc.UpdateDeferred(DBName, tblBudgetDate, budgetDateId, updateObj)
            .done(function (rowsUpdated) {
                if (rowsUpdated === 1) {
                    deferred.resolve();
                }
                else {
                    deferred.reject(rowsUpdated + " rows updated");
                }
            })
            .fail(function (failReason) {
                deferred.reject(failReason);
            });

        return deferred.promise();
    };

    // #endregion Saving

    // Return the constructor
    return ApiClient;

})();
