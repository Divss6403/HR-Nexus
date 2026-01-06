
const fs = require("fs");
const path = require("path");
const express = require("express");
const { execSync } = require("child_process");

function getCodeServerPassword() {
  try {
    const conf = fs.readFileSync(
      "/etc/supervisor/conf.d/supervisord_code_server.conf",
      "utf8",
    );

    const match = conf.match(/PASSWORD="([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const SUP_PASS = getCodeServerPassword();

function setupDevServer(config) {
  config.setupMiddlewares = (middlewares, devServer) => {
    if (!devServer) throw new Error("webpack-dev-server not defined");
    devServer.app.use(express.json());

    const isAllowedOrigin = (origin) => {
      if (!origin) return false;

      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return true;
      }

      if (origin.match(/^https:\/\/([a-zA-Z0-9-]+\.)*emergent\.sh$/)) {
        return true;
      }

      if (origin.match(/^https:\/\/([a-zA-Z0-9-]+\.)*emergentagent\.com$/)) {
        return true;
      }

      if (origin.match(/^https:\/\/([a-zA-Z0-9-]+\.)*appspot\.com$/)) {
        return true;
      }

      return false;
    };

    devServer.app.get("/ping", (req, res) => {
      res.json({ status: "ok", time: new Date().toISOString() });
    });

    devServer.app.post("/edit-file", (req, res) => {

      const origin = req.get("Origin");
      if (origin && isAllowedOrigin(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
      }

      const key = req.get("x-api-key");
      if (!SUP_PASS || key !== SUP_PASS) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { changes } = req.body;

      if (!changes || !Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({ error: "No changes provided" });
      }

      try {
        const edits = [];
        const rejectedChanges = [];

        const changesByFile = {};
        changes.forEach((change) => {
          if (!changesByFile[change.fileName]) {
            changesByFile[change.fileName] = [];
          }
          changesByFile[change.fileName].push(change);
        });

        Object.entries(changesByFile).forEach(([fileName, fileChanges]) => {
          const frontendRoot = path.resolve(__dirname, '../..');

          const getRelativePath = (absolutePath) => {
            const rel = path.relative(frontendRoot, absolutePath);
            return '/' + rel;
          };

          const findFileRecursive = (dir, filename) => {
            try {
              const files = fs.readdirSync(dir, { withFileTypes: true });

              for (const file of files) {
                const fullPath = path.join(dir, file.name);

                if (file.isDirectory()) {
                  if (
                    file.name === "node_modules" ||
                    file.name === "public" ||
                    file.name === ".git" ||
                    file.name === "build" ||
                    file.name === "dist" ||
                    file.name === "coverage"
                  ) {
                    continue;
                  }
                  const found = findFileRecursive(fullPath, filename);
                  if (found) return found;
                } else if (file.isFile()) {
                  const fileBaseName = file.name.replace(
                    /\.(js|jsx|ts|tsx)$/,
                    "",
                  );
                  if (fileBaseName === filename) {
                    return fullPath;
                  }
                }
              }
            } catch (err) {
            }
            return null;
          };

          let targetFile = findFileRecursive(frontendRoot, fileName);

          if (!targetFile) {
            targetFile = path.resolve(
              frontendRoot,
              "src/components",
              `${fileName}.js`,
            );
          }

          const normalizedTarget = path.normalize(targetFile);
          const isInFrontend =
            normalizedTarget.startsWith(frontendRoot) &&
            !normalizedTarget.includes("..");
          const isNodeModules = normalizedTarget.includes("node_modules");
          const isPublic =
            normalizedTarget.includes("/public/") ||
            normalizedTarget.endsWith("/public");

          if (!isInFrontend || isNodeModules || isPublic) {
            throw new Error(`Forbidden path for file ${fileName}`);
          }

          const parser = require("@babel/parser");
          const traverse = require("@babel/traverse").default;
          const generate = require("@babel/generator").default;
          const t = require("@babel/types");

          if (!fs.existsSync(targetFile)) {
            throw new Error(`File not found: ${targetFile}`);
          }

   
          const currentContent = fs.readFileSync(targetFile, "utf8");

          const ast = parser.parse(currentContent, {
            sourceType: "module",
            plugins: ["jsx", "typescript"],
          });

          // Helper function to parse JSX children
          const parseJsxChildren = (content) => {
            if (content === undefined) {
              return null;
            }

            const sanitizeMetaAttributes = (node) => {
              if (t.isJSXElement(node)) {
                node.openingElement.attributes =
                  node.openingElement.attributes.filter((attr) => {
                    if (
                      t.isJSXAttribute(attr) &&
                      t.isJSXIdentifier(attr.name)
                    ) {
                      return !attr.name.name.startsWith("x-");
                    }
                    return true;
                  });

                node.children.forEach((child) =>
                  sanitizeMetaAttributes(child),
                );
              } else if (t.isJSXFragment(node)) {
                node.children.forEach((child) =>
                  sanitizeMetaAttributes(child),
                );
              }
            };

            try {
              const wrapperExpression = parser.parseExpression(
                `(<gjs-wrapper>${content}</gjs-wrapper>)`,
                {
                  sourceType: "module",
                  plugins: ["jsx", "typescript"],
                },
              );

              if (t.isJSXElement(wrapperExpression)) {
                const innerChildren = wrapperExpression.children || [];
                innerChildren.forEach((child) =>
                  sanitizeMetaAttributes(child),
                );
                return innerChildren;
              }
            } catch (parseError) {
              // Fallback to treating content as raw text if parsing fails
            }

            return [t.jsxText(content)];
          };

          const changesByLine = {};
          fileChanges.forEach((change) => {
            if (!changesByLine[change.lineNumber]) {
              changesByLine[change.lineNumber] = [];
            }
            changesByLine[change.lineNumber].push(change);
          });


          traverse(ast, {
            JSXOpeningElement: (path) => {
              const lineNumber = path.node.loc?.start.line;
              if (!lineNumber) return;

              const changesAtLine = changesByLine[lineNumber];
              if (!changesAtLine || changesAtLine.length === 0) return;
              const elementName = path.node.name.name;

              changesAtLine.forEach((change) => {
                if (elementName !== change.component) return;

                console.log(
                  `[backend] Processing change type: ${change.type || "legacy"} for element: ${elementName}`,
                );

                if (
                  change.type === "className" &&
                  change.className !== undefined
                ) {
                  console.log(
                    `[backend] Processing className change:`,
                    change.className,
                  );

                  let classAttr = path.node.attributes.find(
                    (attr) =>
                      t.isJSXAttribute(attr) &&
                      attr.name.name === "className",
                  );

                  const oldClassName = classAttr?.value?.value || "";

                  if (classAttr) {

                    console.log(
                      `[backend] Updating existing className from:`,
                      classAttr.value?.value,
                      "to:",
                      change.className,
                    );
                    classAttr.value = t.stringLiteral(change.className);
                  } else {
                    console.log(
                      `[backend] Creating new className attribute:`,
                      change.className,
                    );
                    const newClassAttr = t.jsxAttribute(
                      t.jsxIdentifier("className"),
                      t.stringLiteral(change.className),
                    );
                    path.node.attributes.push(newClassAttr);
                  }

                  edits.push({
                    file: getRelativePath(targetFile),
                    lineNumber: lineNumber,
                    element: elementName,
                    type: "className",
                    oldData: oldClassName,
                    newData: change.className,
                  });
                } else if (
                  change.type === "textContent" &&
                  change.textContent !== undefined
                ) {
                  console.log(
                    `[backend] Processing textContent change:`,
                    change.textContent,
                  );

                  const parentElementPath = path.parentPath;
                  if (parentElementPath && parentElementPath.isJSXElement()) {
                    const jsxElementNode = parentElementPath.node;
                    const children = jsxElementNode.children || [];

                    let targetTextNode = null;
                    for (const child of children) {
                      if (t.isJSXText(child) && child.value.trim().length > 0) {
                        targetTextNode = child;
                        break;
                      }
                    }

                    const firstTextNode = targetTextNode;
                    const fallbackWhitespaceNode = children.find(
                      (child) => t.isJSXText(child) && child.value.trim().length === 0,
                    );

                    const newContent = change.textContent;
                    let oldContent = "";

                    const preserveWhitespace = (originalValue, updatedCore) => {
                      const leadingWhitespace =
                        (originalValue.match(/^\s*/) || [""])[0];
                      const trailingWhitespace =
                        (originalValue.match(/\s*$/) || [""])[0];
                      return `${leadingWhitespace}${updatedCore}${trailingWhitespace}`;
                    };

                    if (firstTextNode) {
                      oldContent = firstTextNode.value.trim();
                      firstTextNode.value = preserveWhitespace(
                        firstTextNode.value,
                        newContent,
                      );
                    } else if (fallbackWhitespaceNode) {
                      oldContent = "";
                      fallbackWhitespaceNode.value = preserveWhitespace(
                        fallbackWhitespaceNode.value,
                        newContent,
                      );
                    } else {
                      oldContent = "";
                      const newTextNode = t.jsxText(newContent);
                      jsxElementNode.children = [newTextNode, ...children];
                    }

                    edits.push({
                      file: getRelativePath(targetFile),
                      lineNumber: lineNumber,
                      element: elementName,
                      type: "textContent",
                      oldData: oldContent,
                      newData: newContent,
                    });
                  }
                } else if (
                  change.type === "content" &&
                  change.content !== undefined
                ) {
                  console.log(
                    `[backend] Processing content-only change:`,
                    change.content.slice(0, 100),
                  );

                  const parentElementPath = path.parentPath;
                  if (parentElementPath && parentElementPath.isJSXElement()) {
                    const oldChildren = parentElementPath.node.children || [];
                    const generate = require("@babel/generator").default;
                    const oldContentAST = {
                      type: "JSXFragment",
                      children: oldChildren,
                    };
                    const oldContent = generate(oldContentAST, {}, "")
                      .code.replace(/^<>/, "")
                      .replace(/<\/>$/, "")
                      .trim();

                    const newChildren = parseJsxChildren(change.content);
                    if (newChildren) {
                      parentElementPath.node.children = newChildren;
                    }

                    edits.push({
                      file: getRelativePath(targetFile),
                      lineNumber: lineNumber,
                      element: elementName,
                      type: "content",
                      oldData: oldContent,
                      newData: change.content,
                    });
                  }
                } else {
                  const reason = `Change must have valid type ('className', 'textContent', or 'content'). Received type: ${change.type || 'undefined'}`;
                  rejectedChanges.push({
                    change,
                    reason,
                    file: getRelativePath(targetFile),
                    lineNumber: lineNumber,
                    element: elementName,
                  });
                  console.error(`[backend] REJECTED: ${reason}`, change);
                  console.error(
                    `[backend] This change will be IGNORED to prevent contamination.`,
                  );
                }
              });

              delete changesByLine[lineNumber];
            },
          });
          const { code } = generate(ast, {
            retainLines: true,
            retainFunctionParens: true,
            comments: true,
          });

          const backupFile = targetFile + ".backup";
          if (fs.existsSync(targetFile)) {
            const originalContent = fs.readFileSync(targetFile, "utf8");
            fs.writeFileSync(backupFile, originalContent, "utf8");
          }

          fs.writeFileSync(targetFile, code, "utf8");

          const timestamp = Date.now();
          try {
            execSync(`git -c user.name="visual-edit" -c user.email="support@emergent.sh" add "${targetFile}"`);
            execSync(`git -c user.name="visual-edit" -c user.email="support@emergent.sh" commit -m "visual_edit_${timestamp}"`);
          } catch (gitError) {
            console.error(`Git commit failed: ${gitError.message}`);
          }

          if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
          }
        });

        const response = { status: "ok", edits };
        if (rejectedChanges.length > 0) {
          response.rejectedChanges = rejectedChanges;
        }
        res.json(response);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    devServer.app.options("/edit-file", (req, res) => {
      const origin = req.get("Origin");
      if (origin && isAllowedOrigin(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
        res.sendStatus(200);
      } else {
        res.sendStatus(403);
      }
    });

    return middlewares;
  };
  return config;
}

module.exports = setupDevServer;
