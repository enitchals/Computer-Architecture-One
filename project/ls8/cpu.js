/**
 * LS-8 v2.0 emulator skeleton code
 */

const fs = require('fs');

// Instructions

const ADD  = 0b10101000; // ADD R R
const CMP  = 0b10100000; // CMP R R
const DEC  = 0b01111001; // DEC R
const DIV  = 0b10101011; // DIV R R
const HLT  = 0b00000001; // Halt CPU
const INC  = 0b01111000; // INC R
const JEQ  = 0b01010001; // JEQ R
const JMP  = 0b01010000; // JMP R
const JNE  = 0b01010010; // JNE R
const LDI  = 0b10011001; // LDI R,I(mmediate)
const MUL  = 0b10101010; // MUL R,R
const POP  = 0b01001100; // Pop R
const PRN  = 0b01000011; // Print numeric register
const PUSH = 0b01001101; // Push R
const SUB  = 0b10101001; // SUB R R

const SP = 0x07;

const equalFlag = 0;
const greaterFlag = 1;
const lessFlag = 2;


class CPU {
    constructor(ram) {
        this.ram = ram;

        this.reg = new Array(8).fill(0); // General-purpose registers

        this.reg[SP] = 0xf3; // Stack empty
        
        // Special-purpose registers
        this.reg.PC = 0; // Program Counter
        this.reg.IR = 0; // Instruction Register
        this.reg.FL = 0; // Flags (8-bit register)

		this.setupBranchTable();
    }
    
    checkFlag(flag) {
        return (this.reg.FL & (1 << flag)) >> flag;
    }

	setupBranchTable() {
        let bt = {};
        
        bt[ADD]  = this.ADD;
        bt[CMP]  = this.CMP;
        bt[DEC]  = this.DEC;
        bt[DIV]  = this.DIV;
        bt[HLT]  = this.HLT;
        bt[INC]  = this.INC;
        bt[JEQ]  = this.JEQ;
        bt[JMP]  = this.JMP;
        bt[JNE]  = this.JNE;
        bt[LDI]  = this.LDI;
        bt[MUL]  = this.MUL;
        bt[POP]  = this.POP;
        bt[PRN]  = this.PRN;
        bt[PUSH] = this.PUSH;
        bt[SUB]  = this.SUB;

        for (let k of Object.keys(bt)) {
            bt[k] = bt[k].bind(this);
        }
		this.branchTable = bt;
	}

    poke(address, value) {
        this.ram.write(address, value);
    }

    startClock() {
        const _this = this;
        this.clock = setInterval(() => {
            _this.tick();
        }, 1);
    }

    stopClock() {
        clearInterval(this.clock);
    }

    alu(op, regA, regB, immediate) {
        let valA, valB;
        valA = this.reg[regA];
        if (immediate === undefined) {
            if (regB !== undefined) {
                valB = this.reg[regB];
            }
        } else {
            valB = immediate;
        }
        
        switch (op) {
            case 'ADD':
                this.reg[regA] = (valA + valB) & 255;
                break;
            case 'CMP':
                if (valA === valB) {this.reg.FL |= (1 << equalFlag)} else {this.reg.FL &= ~(1 << equalFlag)}
                if (valA > valB) {this.reg.FL |= (1 << greaterFlag)} else {this.reg.FL &= ~(1 << greaterFlag)}
                if (valA < valB) {this.reg.FL |= (1 << lessFlag)} else {this.reg.FL &= ~(1 << lessFlag)}
                break;
            case 'DEC':
                this.reg[regA] = (valA - 1) & 255;
                break;
            case 'DIV':
                this.reg[regA] = (valA / valB) & 255;
                break;
            case 'INC':
                this.reg[regA] = (valA + 1) & 255;
                break;
            case 'MUL':
                this.reg[regA] = (valA * valB) & 255;
                break;
            case 'SUB':
                this.reg[regA] = (valA - valB) & 255;
                break;


        }
    }

    tick() {
        this.reg.IR = this.ram.read(this.reg.PC);
        const handler = this.branchTable[this.reg.IR];
        
        if (handler === undefined) {
            console.log(`ERROR: invalid instruction ${this.reg.IR.toString(2)}`);
            this.stopClock();
            return;
        }

        const operandA = this.ram.read((this.reg.PC+1) & 0xff);
        const operandB = this.ram.read((this.reg.PC+2) & 0xff);
        const newPC = handler(operandA, operandB);

        if (newPC === undefined) {
            const operandCount = (this.reg.IR >> 6) & 0b11;
            const instSize = operandCount + 1;
            this.alu('ADD', 'PC', null, instSize);
        } else {
            this.reg.PC = newPC;
        }
    }
        


    ADD(regA, regB) {
        this.alu('ADD', regA, regB);
    }

    CMP(regA, regB) {
        this.alu('CMP', regA, regB);
    }

    DEC(reg) {
        this.alu('DEC', reg);
    }

    DIV(regA, regB) {
        this.alu('DIV', regA, regB);
    }

    HLT() {
        this.stopClock();
    }

    INC(reg) {
        this.alu('INC', reg);
    }

    JEQ(reg) {
        if (this.checkFlag(equalFlag)) {
            return this.reg[reg];
        }
    }

    JMP(reg) {
        return this.reg[reg];
    }

    JNE(reg) {
        if (!this.checkFlag(equalFlag)) {
            return this.reg[reg];
        }
    }

    LDI(reg, val) {
        this.reg[reg] = val;
    }

    MUL(regA, regB) {
        this.alu('MUL', regA, regB);
    }

    _pop() {
        const val = this.ram.read(this.reg[SP]);
        this.alu('INC', SP);
        return val;
    }

    POP(reg) {
        this.reg[reg] = this._pop();
    }

    _push(reg) {
        this.alu('DEC', SP);
        this.ram.write(this.reg[SP], val);
    }

    PUSH(reg) {
        this._push(this.reg[reg]);
    }

    PRN(regA) {
        fs.writeSync(process.stdout.fd, this.reg[regA]);
    }

    SUB(regA, regB) {
        this.alu('SUB', regA, regB);
    }
}

module.exports = CPU;
