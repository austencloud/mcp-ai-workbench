// Web browsing related shared types
export var EntityType;
(function (EntityType) {
    EntityType["PERSON"] = "person";
    EntityType["ORGANIZATION"] = "organization";
    EntityType["LOCATION"] = "location";
    EntityType["DATE"] = "date";
    EntityType["MONEY"] = "money";
    EntityType["PERCENTAGE"] = "percentage";
    EntityType["PRODUCT"] = "product";
    EntityType["EVENT"] = "event";
})(EntityType || (EntityType = {}));
export var TimeRange;
(function (TimeRange) {
    TimeRange["HOUR"] = "hour";
    TimeRange["DAY"] = "day";
    TimeRange["WEEK"] = "week";
    TimeRange["MONTH"] = "month";
    TimeRange["YEAR"] = "year";
    TimeRange["ALL"] = "all";
})(TimeRange || (TimeRange = {}));
export var ActionType;
(function (ActionType) {
    ActionType["CLICK"] = "click";
    ActionType["SCROLL"] = "scroll";
    ActionType["TYPE"] = "type";
    ActionType["SCREENSHOT"] = "screenshot";
    ActionType["EXTRACT"] = "extract";
    ActionType["ANALYZE"] = "analyze";
})(ActionType || (ActionType = {}));
//# sourceMappingURL=web.js.map