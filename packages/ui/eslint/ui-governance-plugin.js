const CLASSNAME_HELPER_NAMES = new Set(["cn", "clsx", "twMerge"]);

const COLOR_LITERAL_PATTERN =
  /#(?:[\da-fA-F]{3,4}|[\da-fA-F]{6}|[\da-fA-F]{8})\b|(?:rgb|rgba|hsl|hsla|oklch)\(/;
const TAILWIND_ARBITRARY_COLOR_CLASS_PATTERN =
  /^(?:bg|text|border|outline|ring|fill|stroke|from|via|to)-\[[^\]]+\]$/;

const STYLE_COLOR_PROPERTY_PATTERN =
  /color|background|border|outline|stroke|fill|shadow/i;

function splitClassTokens(value) {
  if (typeof value !== "string") {
    return [];
  }
  return value.trim().split(/\s+/).filter(Boolean);
}

function collectClassTokens(node) {
  if (!node) {
    return [];
  }

  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" ? splitClassTokens(node.value) : [];
    case "TemplateLiteral":
      return node.quasis.flatMap((part) =>
        splitClassTokens(part.value.cooked ?? ""),
      );
    case "BinaryExpression":
      return [
        ...collectClassTokens(node.left),
        ...collectClassTokens(node.right),
      ];
    case "ConditionalExpression":
      return [
        ...collectClassTokens(node.consequent),
        ...collectClassTokens(node.alternate),
      ];
    case "LogicalExpression":
      return [
        ...collectClassTokens(node.left),
        ...collectClassTokens(node.right),
      ];
    case "ArrayExpression":
      return node.elements.flatMap((element) => collectClassTokens(element));
    case "ObjectExpression":
      return node.properties.flatMap((property) => {
        if (
          property?.type !== "Property" ||
          property.computed ||
          property.key.type !== "Literal" ||
          typeof property.key.value !== "string"
        ) {
          return [];
        }
        return splitClassTokens(property.key.value);
      });
    case "CallExpression":
      if (
        node.callee.type === "Identifier" &&
        CLASSNAME_HELPER_NAMES.has(node.callee.name)
      ) {
        return node.arguments.flatMap((arg) => collectClassTokens(arg));
      }
      return [];
    case "JSXExpressionContainer":
      return collectClassTokens(node.expression);
    default:
      return [];
  }
}

function readStylePropertyName(property) {
  if (
    property.type !== "Property" ||
    property.computed ||
    (property.key.type !== "Identifier" && property.key.type !== "Literal")
  ) {
    return null;
  }

  if (property.key.type === "Identifier") {
    return property.key.name;
  }

  return typeof property.key.value === "string" ? property.key.value : null;
}

function hasRawColorLiteral(node) {
  if (!node) {
    return false;
  }

  switch (node.type) {
    case "Literal":
      return (
        typeof node.value === "string" && COLOR_LITERAL_PATTERN.test(node.value)
      );
    case "TemplateLiteral":
      return node.quasis.some((part) =>
        COLOR_LITERAL_PATTERN.test(part.value.cooked ?? ""),
      );
    case "CallExpression":
      return node.arguments.some((argument) => hasRawColorLiteral(argument));
    case "ConditionalExpression":
      return (
        hasRawColorLiteral(node.consequent) ||
        hasRawColorLiteral(node.alternate)
      );
    case "LogicalExpression":
      return hasRawColorLiteral(node.left) || hasRawColorLiteral(node.right);
    default:
      return false;
  }
}

const maxTailwindClassesRule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn when className contains too many utility classes. Prefer reusable UI primitives.",
    },
    schema: [
      {
        type: "object",
        properties: {
          max: {
            type: "integer",
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyClasses:
        "className has {{count}} utility classes (max: {{max}}). Extract a reusable component or compose with shared class helpers.",
    },
  },
  create(context) {
    const configuredMax = context.options[0]?.max ?? 12;

    return {
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "className"
        ) {
          return;
        }

        if (!node.value) {
          return;
        }

        const tokens = collectClassTokens(node.value);
        if (tokens.length > configuredMax) {
          context.report({
            node,
            messageId: "tooManyClasses",
            data: {
              count: String(tokens.length),
              max: String(configuredMax),
            },
          });
        }
      },
    };
  },
};

const noRawColorValuesRule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn on raw color usage in JSX className/style. Prefer semantic palette tokens.",
    },
    schema: [],
    messages: {
      arbitraryColorClass:
        "Avoid arbitrary Tailwind color class '{{className}}'. Use semantic palette tokens/components instead.",
      rawInlineColor:
        "Avoid raw inline color values in style prop. Use palette tokens/CSS variables.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || !node.value) {
          return;
        }

        if (node.name.name === "className") {
          const tokens = collectClassTokens(node.value);
          const arbitraryColorToken = tokens.find((token) =>
            TAILWIND_ARBITRARY_COLOR_CLASS_PATTERN.test(token),
          );

          if (arbitraryColorToken) {
            context.report({
              node,
              messageId: "arbitraryColorClass",
              data: {
                className: arbitraryColorToken,
              },
            });
          }
        }

        if (
          node.name.name === "style" &&
          node.value.type === "JSXExpressionContainer" &&
          node.value.expression.type === "ObjectExpression"
        ) {
          const colorProperty = node.value.expression.properties.find(
            (property) => {
              if (property.type !== "Property") {
                return false;
              }

              const key = readStylePropertyName(property);
              if (!key || !STYLE_COLOR_PROPERTY_PATTERN.test(key)) {
                return false;
              }

              return hasRawColorLiteral(property.value);
            },
          );

          if (colorProperty) {
            context.report({
              node: colorProperty,
              messageId: "rawInlineColor",
            });
          }
        }
      },
    };
  },
};

const uiGovernancePlugin = {
  rules: {
    "max-tailwind-classes": maxTailwindClassesRule,
    "no-raw-color-values": noRawColorValuesRule,
  },
};

export default uiGovernancePlugin;
