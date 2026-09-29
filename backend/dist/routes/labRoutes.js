"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const labController_1 = require("../controllers/labController");
const equipmentController_1 = require("../controllers/equipmentController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
// Leitura de laboratórios é aberta (usuários autenticados ou não)
router.get('/', labController_1.listLabs);
router.get('/:id', labController_1.getLab);
// Equipamentos do laboratório
router.get('/:laboratorioId/equipments', equipmentController_1.listEquipments);
router.post('/:laboratorioId/equipments', auth_1.authenticate, (0, authorize_1.requireRole)('ADMIN'), equipmentController_1.createEquipment);
// Modificações de laboratório exigem ADMIN
router.post('/', auth_1.authenticate, (0, authorize_1.requireRole)('ADMIN'), labController_1.createLab);
router.patch('/:id', auth_1.authenticate, (0, authorize_1.requireRole)('ADMIN'), labController_1.updateLab);
router.delete('/:id', auth_1.authenticate, (0, authorize_1.requireRole)('ADMIN'), labController_1.deleteLab);
exports.default = router;
