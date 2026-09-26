# DESIGN:OS System One — Art Direction & Meta-Prompt Specification

> **Style System**: Luminous Layered Precision (Isometric 3D)  
> **Source Lineage**: Adapted from [design-os-pedagogy](https://github.com/jangtrinh/design-os-pedagogy/blob/main/ART-DIRECTION.md)  
> **Philosophy**: Architectural exploded-view product visualization translating non-autoregressive decision models, sub-10ms tensor evaluation, speculative commit state machines, and dual-brain agent loops into tactile, frosted-glass hardware layers with strict 35° isometric perspective, minimal typography, and high-key studio illumination.

---

## 📐 The 4 Core Visual Laws

| Law | Specification | Anti-Pattern to Avoid |
|---|---|---|
| **1. Strict 35° Isometric Grid** | Every component (decision routing gates, tensor registers, fencing token latches, commit pipelines) must be mapped flush onto the 3D surface plane of its glass wafer. | 2D flat text overlays, misaligned skew, floating billboards disconnected from plane |
| **2. Radical Textless Minimization (Strict)** | Aim for 100% textless tactile design. If required, max 1 single glyph, number, or 1-token abbreviation (e.g., `τ`, `0.30`, `6.5`, `S1`, `MLX`, `100%`). NEVER permit multi-word phrases, sentences, headers, explanatory text, or floating labels. | Any multi-word phrases, sentences, paragraph blocks, poster headers, cluttered text |
| **3. Tactile Glass & Material Physics** | Thick borosilicate glass wafers with rounded corners, 1px bright specular chamfers, soft caustic refractions, hovering over a brushed frosted aluminum chassis. | Flat opacity boxes, dirty smudge textures, harsh plastic reflections, cyberpunk gridlines |
| **4. High-Key Studio Lighting & Anti-Murkiness (Strict)** | High-key daylight softbox illumination over a bright seamless pale lilac/lavender atmosphere (`#F5F4FC` → `#FAF9FE`). Borosilicate glass with 90% light transmission, ethereal subsurface glow (never oversaturated), resting on pearl-white aluminum (`#F0EEF8`). | Dark backgrounds, dark blue/purple shadows, heavy saturation, cyberpunk gloom, high contrast blacks, murky textures |

---

## 🎨 Design Tokens & Palette

```yaml
Atmosphere:
  canvas_base: "#F5F4FC"      # Clean soft atmospheric lilac
  ambient_lavender: "#ECE7FF" # Subtle secondary depth glow
  fill_daylight: "#DFEDFF"    # Subtle daylight fill

Materials:
  wafer_glass: "Translucent borosilicate glass (90% transmission, refractive index 1.52)"
  edge_bevel: "1px crisp white specular chamfer (#FFFFFF)"
  chassis_base: "Anodized pearl-white & satin-brushed aluminum (#F0EEF8)"
  caustic_shadow: "Soft neutral-violet contact shadows rgba(105, 80, 216, 0.08)"

Luminous Decision Accents:
  royal_violet: "#6950D8"     # System 1 Decision Core, non-autoregressive tensors, calibrated reasoning
  electric_cyan: "#66CFF5"    # Local Edge Laya-MLX, low-latency Apple Silicon fast path (<10ms)
  amber_alert: "#F5A623"      # Confidence evaluation gate (threshold τ = 0.30), cloud escalation trigger
  emerald_valid: "#2ECC71"    # Verified postcondition, lease token latch, deterministic stop gate
```

---

## 🧬 Reusable Meta-Prompt Schema

```text
High-end 3D architectural exploded isometric product visualization demonstrating {TOPIC_NAME} in a Next-Gen Agentic Decision Engine (design-os-system-one).
Style: Luminous Layered Precision.
Color palette: Clean soft lilac studio background (#F5F4FC, #ECE7FF), royal violet (#6950D8) and electric cyan (#66CFF5) glowing decision elements, amber (#F5A623) threshold accents, white translucent frosted borosilicate glass wafers with sharp 1px specular edges.
Composition: 35-degree isometric exploded view with 3 vertically floating translucent glass interface slabs hovering over a solid frosted satin-aluminum chassis slab:
- Base chassis ({TIER_1_NAME}): {TIER_1_ELEMENTS_EMBOSSED_ON_PLANE}.
- Middle slab ({TIER_2_NAME}): {TIER_2_ELEMENTS_EMBOSSED_ON_PLANE}.
- Top slab ({TIER_3_NAME}): {TIER_3_ELEMENTS_EMBOSSED_ON_PLANE}.
Perspective & Affordance: Strict 35-degree isometric alignment. All tactile chips, tensor slots, diagnostic gauges, and latch indicators are surface-mapped directly onto the glass planes with realistic depth, specular highlights, and soft caustic contact shadows.
Typography: Ultra-minimal. No long sentences, no paragraphs, no canvas titles. Pure tactile iconography, numbers, and short functional chips (e.g. 'τ', '0.30', '6.5', 'S1').
Lighting: Soft high-key daylight studio softbox lighting with delicate caustic refractions, diffused violet-cyan subsurface glow beneath each layer, 8k crisp raytraced industrial product design render.
Avoid: Dark backgrounds, black sci-fi, cyberpunk neon clutter, avatars, human figures, floating 2D billboard text.
```

---

## 🗺️ Master Visual Roadmap for design-os-system-one

| ID | Section | Topic | Visual Metaphor |
|---|---|---|---|
| 1 | `Hero Overview` | Master System 1 Chassis | 4 vertically floating translucent glass slabs (Silicon Memory, Tensors, Gateway, Commit Engine) over pearl-white aluminum chassis |
| 2 | `2.1 / 4.2` | Dual-Brain Cascade Router ($\tau = 0.30$) | Local Apple Silicon base wafer, glowing amber threshold prism splitting cyan 70% local flow from violet 30% cloud escalation |
| 3 | `4.1` | 5-Stage Speculative Commit Engine | Stepped linear glass wafer pipeline (Observed → Evaluated → Prepared → Dispatching → Verifying → Confirmed) with emerald latch |
| 4 | `4.3` | Sub-50ms Fast Generative UI | Real-time adaptive UI engine: Apple Silicon local classifier wafer, Zod schema catalog prism, morphing canvas slab |
