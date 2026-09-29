"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = runSeed;
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const Lab_1 = require("../models/Lab");
const Equipment_1 = require("../models/Equipment");
const SystemSettings_1 = require("../models/SystemSettings");
async function runSeed(options = {}) {
    const log = (msg) => {
        if (!options.silent)
            console.log(msg);
    };
    log('--- INICIANDO SEED DO BANCO DE DADOS ---');
    await (0, db_1.connectDB)();
    // 1. Inicializar ou sincronizar as Configurações do Sistema
    log('[1/4] Configurando parâmetros globais do sistema...');
    let settings = await SystemSettings_1.SystemSettings.findOne({ singletonKey: 'SYSTEM_SETTINGS_SINGLETON' });
    if (!settings) {
        settings = await SystemSettings_1.SystemSettings.create({
            singletonKey: 'SYSTEM_SETTINGS_SINGLETON',
            reservationWindowWeeks: 4,
            exceptionAdvanceDays: 1,
            schoolDays: [1, 2, 3, 4, 5],
            timezone: env_1.config.timezone,
            lessons: [
                { numero: 1, nome: 'Aula 1', horarioInicio: '07:00', horarioFim: '07:50' },
                { numero: 2, nome: 'Aula 2', horarioInicio: '07:50', horarioFim: '08:40' },
                { numero: 3, nome: 'Aula 3', horarioInicio: '08:55', horarioFim: '09:45' },
                { numero: 4, nome: 'Aula 4', horarioInicio: '09:45', horarioFim: '10:35' },
                { numero: 5, nome: 'Aula 5', horarioInicio: '10:50', horarioFim: '11:40' },
                { numero: 6, nome: 'Aula 6', horarioInicio: '11:40', horarioFim: '12:30' }
            ]
        });
        log(' -> Configurações globais criadas com sucesso.');
    }
    else {
        log(' -> Configurações globais já existentes.');
    }
    // 2. Inicializar os 5 Laboratórios Obrigatórios
    log('[2/4] Cadastrando laboratórios oficiais...');
    const initialLabs = [
        {
            codigo: 'lab1',
            nome: 'Lab 1',
            descricao: 'Laboratório de Informática 1 - Programação e Desenvolvimento Web',
            capacidade: 35,
            localizacao: 'Bloco A - Sala 101',
            ativo: true
        },
        {
            codigo: 'lab2',
            nome: 'Lab 2',
            descricao: 'Laboratório de Informática 2 - Banco de Dados e Redes',
            capacidade: 35,
            localizacao: 'Bloco A - Sala 102',
            ativo: true
        },
        {
            codigo: 'lab3',
            nome: 'Lab 3',
            descricao: 'Laboratório de Informática 3 - Design Gráfico e Multimídia',
            capacidade: 30,
            localizacao: 'Bloco B - Sala 201',
            ativo: true
        },
        {
            codigo: 'lab4',
            nome: 'Lab 4',
            descricao: 'Laboratório de Informática 4 - Manutenção e Hardware',
            capacidade: 30,
            localizacao: 'Bloco B - Sala 202',
            ativo: true
        },
        {
            codigo: 'labfund',
            nome: 'Lab Fund',
            descricao: 'Laboratório de Informática Fundamental - Robótica Educacional e Iniciação',
            capacidade: 25,
            localizacao: 'Bloco C - Ensino Fundamental',
            ativo: true
        }
    ];
    const createdLabs = [];
    for (const labData of initialLabs) {
        let lab = await Lab_1.Lab.findOne({ codigo: labData.codigo });
        if (!lab) {
            lab = await Lab_1.Lab.create(labData);
            log(` -> Criado: ${lab.nome} (${lab.codigo})`);
        }
        else {
            log(` -> Já existente: ${lab.nome}`);
        }
        createdLabs.push(lab);
    }
    // 3. Cadastrar equipamentos exemplares nos laboratórios
    log('[3/4] Verificando inventário de equipamentos...');
    for (const lab of createdLabs) {
        const equipCount = await Equipment_1.Equipment.countDocuments({ laboratorioId: lab._id });
        if (equipCount === 0) {
            await Equipment_1.Equipment.create([
                {
                    laboratorioId: lab._id,
                    nome: `Computadores Desktop (${lab.capacidade} unidades)`,
                    tipo: 'Computador',
                    numeroPatrimonio: `PAT-${lab.codigo.toUpperCase()}-001`,
                    descricao: `Desktops Intel Core i5, 16GB RAM, SSD 512GB para alunos`,
                    status: 'ATIVO'
                },
                {
                    laboratorioId: lab._id,
                    nome: 'Projetor Multimídia Epson',
                    tipo: 'Projetor',
                    numeroPatrimonio: `PAT-${lab.codigo.toUpperCase()}-002`,
                    descricao: 'Projetor teto HDMI Full HD 3500 lumens',
                    status: 'ATIVO'
                },
                {
                    laboratorioId: lab._id,
                    nome: 'Switch Gerenciável Gigabit 48 Portas',
                    tipo: 'Switch',
                    numeroPatrimonio: `PAT-${lab.codigo.toUpperCase()}-003`,
                    descricao: 'Equipamento de rede central do laboratório',
                    status: 'ATIVO'
                }
            ]);
            log(` -> Equipamentos iniciais adicionados ao ${lab.nome}`);
        }
    }
    // 4. Cadastrar o Primeiro Administrador com Credenciais de Ambiente
    log('[4/4] Verificando primeiro administrador...');
    const adminEmail = env_1.config.adminInitial.email.toLowerCase().trim();
    let admin = await User_1.User.findOne({ email: adminEmail });
    if (!admin) {
        admin = await User_1.User.create({
            nome: env_1.config.adminInitial.nome,
            email: adminEmail,
            senha: env_1.config.adminInitial.senha,
            role: 'ADMIN',
            status: 'ATIVO'
        });
        log(` -> Administrador inicial criado com sucesso: ${admin.email}`);
    }
    else {
        log(` -> Administrador já existente: ${admin.email}`);
    }
    log('--- SEED CONCLUÍDO COM SUCESSO ---');
}
// Se executado diretamente via terminal (npm run seed)
if (require.main === module) {
    runSeed()
        .then(async () => {
        await (0, db_1.disconnectDB)();
        process.exit(0);
    })
        .catch(async (err) => {
        console.error('[ERRO DURANTE O SEED]:', err);
        await (0, db_1.disconnectDB)();
        process.exit(1);
    });
}
