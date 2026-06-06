# Paste Artifacts Reference

This document catalogs specific HTML artifacts generated when pasting content from Microsoft Excel, Outlook, and Gmail, focusing on Regex-cleanable patterns.

## 1. Microsoft Excel

Excel generates complex HTML tables with heavy inline styling and proprietary namespace attributes.

### 1.1 Attributes & Namespaces
*   `x:str`: Marks a cell containing a string.
    *   **Regex:** `\s+x:str(?:="[^"]*")?`
*   `x:num`: Marks a cell containing a number.
    *   **Regex:** `\s+x:num(?:="[^"]*")?`
*   `v:ext`: VML extension attribute (often on `tr` or `td`).
    *   **Regex:** `\s+v:ext="[^"]*"`
*   `x:fmla`: Excel formula attribute.
    *   **Regex:** `\s+x:fmla="[^"]*"`

### 1.2 Structural Artifacts
*   **Column Definitions:** `<col>` tags often with specific widths.
    *   **Regex:** `<col[^>]*>`
*   **Empty Rows/Cells:** Excel often pastes a grid larger than the content.
    *   **Regex:** `<tr[^>]*>\s*(?:<td[^>]*>\s*<\/td>\s*)+<\/tr>` (Heuristic for empty rows)

### 1.3 Styles
*   **mso-number-format:** CSS property for cell formatting.
    *   **Regex:** `mso-number-format:[^;"]+;?`
*   **xl classes:** Classes like `.xl65`, `.xl66` generated in `<style>` blocks or applied to elements.
    *   **Regex:** `class="xl[0-9]+"`

### 1.4 Comments
*   **Misaligned Columns:** `<!--[if supportMisalignedColumns]>`
    *   **Regex:** `<!--\[if supportMisalignedColumns\]>[\s\S]*?<!\[endif\]-->`

---

## 2. Microsoft Outlook (Desktop & Web)

Outlook (using Word as a rendering engine) produces similar artifacts to Word but with web-specific prefixes when viewed in OWA or forwarded.

### 2.1 Classes (Web/OWA)
*   **x_ Prefix:** OWA (Outlook Web App) often prefixes generic classes with `x_`.
    *   **Regex:** `class="x_Mso[a-zA-Z0-9]+"` (e.g., `x_MsoNormal`, `x_MsoListParagraph`)
*   **Wrapper Divs:**
    *   `div.x_microsoft_container`
    *   **Regex:** `<div[^>]*class="x_microsoft_container"[^>]*>`

### 2.2 VML (Vector Markup Language)
Outlook relies heavily on VML for images and shapes.
*   **Tags:** `<v:shape>`, `<v:imagedata>`, `<w:wrap>`, `<o:lock>`.
    *   **Regex:** `<\/?v:[^>]+>`
    *   **Regex:** `<\/?w:[^>]+>`
    *   **Regex:** `<\/?o:[^>]+>`

### 2.3 Comments
*   **Conditional Comments:** `<!--[if gte mso 9]>`
    *   **Regex:** `<!--\[if gte mso \d+\]>[\s\S]*?<!\[endif\]-->`

---

## 3. Gmail

Gmail wraps content in specific containers and applies classes for quotes and signatures.

### 3.1 Classes
*   **Quote Wrapper:** `gmail_quote` is the standard class for replied text.
    *   **Regex:** `class="gmail_quote"`
*   **Signature:** `gmail_signature`.
    *   **Regex:** `class="gmail_signature"`
*   **Default:** `gmail_default` (often on spans/divs).
    *   **Regex:** `class="gmail_default"`
*   **Extra:** `gmail_extra`.
    *   **Regex:** `class="gmail_extra"`

### 3.2 Structural Artifacts
*   **Attribute Removal:** Gmail content often has these specific classes on `<div>` or `<blockquote>` elements.
    *   **Strategy:** Unwrap elements with `gmail_quote` (if keeping content) or remove if cleaning history.

### 3.3 Attributes
*   **data-smartmail:** Attributes like `data-smartmail="gmail_signature"`.
    *   **Regex:** `data-smartmail="[^"]*"`

---

## Summary of Regex Patterns for Implementation

| Source | Artifact Type | Pattern (JS Regex String) | Description |
| :--- | :--- | :--- | :--- |
| **Excel** | Attribute | `\s+(?:x:str|x:num|x:fmla)(?:="[^"]*")?` | Excel specific data attributes |
| **Excel** | Tag | `<col[^>]*>` | Column definitions |
| **Excel** | Style | `mso-number-format:[^;"]+;?` | Number formatting styles |
| **Outlook** | Class | `class="x_(?:Mso[a-zA-Z0-9]+|microsoft_container)"` | OWA prefixed classes |
| **Outlook** | Tag | `<\/?(?:v|o|w):[^>]+>` | VML and Office namespaces |
| **Gmail** | Class | `class="gmail_(?:quote|signature|default|extra)"` | Gmail wrapper classes |
| **Gmail** | Attribute | `data-smartmail="[^"]*"` | Smartmail attributes |
