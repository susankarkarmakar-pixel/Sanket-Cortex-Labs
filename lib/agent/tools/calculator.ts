import { ToolDefinition } from "@/lib/agent/types";

interface CalculatorInput {
  expression: string;
}

interface CalculatorOutput {
  expression: string;
  value: number;
}

export const calculatorTool: ToolDefinition<CalculatorInput, CalculatorOutput> = {
  id: "calculator",
  name: "Calculator",
  description: "Evaluate basic arithmetic expressions without executing code.",
  permission: "read-only",
  inputSchema: {
    type: "object",
    properties: { expression: { type: "string", maxLength: 500 } },
    required: ["expression"],
    additionalProperties: false,
  },
  async execute(input, context) {
    if (context.signal.aborted) throw new Error("Calculator execution was cancelled.");
    if (!input || typeof input.expression !== "string" || input.expression.trim().length === 0) throw new Error("A calculator expression is required.");
    if (input.expression.length > 500) throw new Error("Calculator expressions must be 500 characters or shorter.");
    const value = evaluateArithmetic(input.expression);
    if (!Number.isFinite(value)) throw new Error("The calculator result is not a finite number.");
    return { expression: input.expression.trim(), value };
  },
};

function evaluateArithmetic(expression: string): number {
  const parser = new ArithmeticParser(expression);
  const result = parser.parseExpression();
  parser.expectEnd();
  return result;
}

class ArithmeticParser {
  private position = 0;

  constructor(private readonly source: string) {}

  parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      this.skipWhitespace();
      const operator = this.source[this.position];
      if (operator !== "+" && operator !== "-") return value;
      this.position += 1;
      const right = this.parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      this.skipWhitespace();
      const operator = this.source[this.position];
      if (operator !== "*" && operator !== "/") return value;
      this.position += 1;
      const right = this.parseFactor();
      if (operator === "/" && right === 0) throw new Error("Division by zero is not allowed.");
      value = operator === "*" ? value * right : value / right;
    }
  }

  private parseFactor(): number {
    this.skipWhitespace();
    const character = this.source[this.position];
    if (character === "+" || character === "-") {
      this.position += 1;
      const value = this.parseFactor();
      return character === "-" ? -value : value;
    }
    if (character === "(") {
      this.position += 1;
      const value = this.parseExpression();
      this.skipWhitespace();
      if (this.source[this.position] !== ")") throw new Error("Missing closing parenthesis.");
      this.position += 1;
      return value;
    }
    const number = this.source.slice(this.position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)?.[0];
    if (!number) throw new Error(`Unexpected token near position ${this.position + 1}.`);
    this.position += number.length;
    return Number(number);
  }

  expectEnd(): void {
    this.skipWhitespace();
    if (this.position !== this.source.length) throw new Error(`Unexpected token near position ${this.position + 1}.`);
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.position] || "")) this.position += 1;
  }
}
