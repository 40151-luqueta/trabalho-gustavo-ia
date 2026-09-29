"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
// Todas as rotas de gerenciamento de usuários exigem privilégio de ADMIN
router.use(auth_1.authenticate, (0, authorize_1.requireRole)('ADMIN'));
router.get('/', userController_1.listUsers);
router.post('/', userController_1.createUser);
router.get('/:id', userController_1.getUser);
router.patch('/:id', userController_1.updateUser);
router.delete('/:id', userController_1.deleteUser);
router.patch('/:id/approve', userController_1.approveProfessor);
exports.default = router;
