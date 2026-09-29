"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reservationController_1 = require("../controllers/reservationController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar reservas (professores e admins)
router.get('/', reservationController_1.listReservations);
// Verificar disponibilidade e elegibilidade antes de confirmar (UX assistida)
router.post('/check', authorize_1.requireCanReserve, reservationController_1.checkReservation);
// Criar reserva (apenas professores ativos e admins)
router.post('/', authorize_1.requireCanReserve, reservationController_1.createReservation);
// Cancelar reserva (dono da reserva ou admin)
router.delete('/:id', authorize_1.requireCanReserve, reservationController_1.cancelReservation);
exports.default = router;
