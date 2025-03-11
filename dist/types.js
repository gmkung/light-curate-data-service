"use strict";
// Define types used throughout the package
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemStatus = void 0;
var ItemStatus;
(function (ItemStatus) {
    ItemStatus[ItemStatus["Absent"] = 0] = "Absent";
    ItemStatus[ItemStatus["Registered"] = 1] = "Registered";
    ItemStatus[ItemStatus["RegistrationRequested"] = 2] = "RegistrationRequested";
    ItemStatus[ItemStatus["ClearingRequested"] = 3] = "ClearingRequested";
})(ItemStatus || (exports.ItemStatus = ItemStatus = {}));
