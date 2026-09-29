"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publicController_1 = require("../controllers/publicController");
const router = (0, express_1.Router)();
// Endpoint totalmente público sem exigência de autenticação
router.get('/schedule', publicController_1.getPublicSchedule);
router.get('/info', publicController_1.getPublicInfo);
exports.default = router;
