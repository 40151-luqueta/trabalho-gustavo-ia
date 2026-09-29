"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ruleController_1 = require("../controllers/ruleController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Professores e Admins podem visualizar regras
router.get('/', (0, authorize_1.requireRole)('PROFESSOR', 'ADMIN'), ruleController_1.listRules);
// Apenas Administradores podem criar, alterar ou remover regras
router.post('/', (0, authorize_1.requireRole)('ADMIN'), ruleController_1.createRule);
router.patch('/:id', (0, authorize_1.requireRole)('ADMIN'), ruleController_1.updateRule);
router.delete('/:id', (0, authorize_1.requireRole)('ADMIN'), ruleController_1.deleteRule);
exports.default = router;
