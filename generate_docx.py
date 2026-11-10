import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = Document()
    
    # Page setup - Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header & Footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("Team UltronX  |  Onboarding Buddy Hackathon Submission")
        f_run.font.name = "Segoe UI"
        f_run.font.size = Pt(8.5)
        f_run.font.color.rgb = RGBColor(148, 163, 184) # Slate 400

    # Colors
    PRIMARY = RGBColor(30, 27, 75)     # Deep Indigo
    ACCENT = RGBColor(99, 102, 241)    # Bright Indigo / Violet
    EMERALD = RGBColor(16, 185, 129)   # Emerald
    DARK_SLATE = RGBColor(15, 23, 42)  # Slate 900
    MUTED_GRAY = RGBColor(100, 116, 139) # Slate 500
    HEX_PRIMARY = "1E1B4B"
    HEX_ACCENT = "4F46E5"
    HEX_LIGHT_BG = "F8FAFC"
    HEX_BORDER = "E2E8F0"
    HEX_PURPLE_BG = "EEF2FF"

    # Title Banner Table
    title_table = doc.add_table(rows=1, cols=1)
    title_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = title_table.rows[0].cells[0]
    cell.width = Inches(6.9)
    set_cell_background(cell, "1E1B4B")
    set_cell_margins(cell, top=260, bottom=260, left=260, right=260)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    run_badge = p.add_run("HACKATHON OFFICIAL SUBMISSION  •  TEAM ULTRONX\n")
    run_badge.font.name = "Segoe UI"
    run_badge.font.size = Pt(9.5)
    run_badge.font.bold = True
    run_badge.font.color.rgb = RGBColor(167, 139, 250) # Light Purple

    run_title = p.add_run("ONBOARDING BUDDY\n")
    run_title.font.name = "Segoe UI"
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(255, 255, 255)

    run_sub = p.add_run("The Context-Aware AI Mentor That Remembers Your Codebase Journey")
    run_sub.font.name = "Segoe UI"
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = RGBColor(224, 231, 255)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Metadata Callout Card
    meta_table = doc.add_table(rows=1, cols=1)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_cell = meta_table.rows[0].cells[0]
    m_cell.width = Inches(6.9)
    set_cell_background(m_cell, "F1F5F9")
    set_cell_margins(m_cell, top=140, bottom=140, left=180, right=180)

    mp = m_cell.paragraphs[0]
    mp.paragraph_format.space_after = Pt(2)
    m1 = mp.add_run("👥 Team Name: ")
    m1.font.bold = True
    m1.font.name = "Segoe UI"
    m1.font.color.rgb = PRIMARY
    mp.add_run("UltronX\n").font.name = "Segoe UI"

    m2 = mp.add_run("🌟 Team Members: ")
    m2.font.bold = True
    m2.font.name = "Segoe UI"
    m2.font.color.rgb = PRIMARY
    mp.add_run("Soha Iffat, Bharath G, N Chaitanya, Lavanya V, Sammy M, Haider S Vadgamwala\n").font.name = "Segoe UI"

    m3 = mp.add_run("🔗 GitHub Repository: ")
    m3.font.bold = True
    m3.font.name = "Segoe UI"
    m3.font.color.rgb = PRIMARY
    mp.add_run("https://github.com/HaiderV/Onboarding-Buddy\n").font.name = "Segoe UI"

    m4 = mp.add_run("⚡ Tech Stack: ")
    m4.font.bold = True
    m4.font.name = "Segoe UI"
    m4.font.color.rgb = PRIMARY
    mp.add_run("FastAPI (Python 3.11), Groq LLM Acceleration, Hindsight Dual Memory, MongoDB Atlas, Vite + React 18, VS Code Extension API").font.name = "Segoe UI"

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Helper function for headings
    def add_custom_heading(text, level=1):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(4)
        h.paragraph_format.keep_with_next = True
        run = h.add_run(text)
        run.font.name = "Segoe UI"
        run.font.bold = True
        if level == 1:
            run.font.size = Pt(15)
            run.font.color.rgb = ACCENT
            # Add subtle underline or marker
        elif level == 2:
            run.font.size = Pt(12)
            run.font.color.rgb = PRIMARY
        elif level == 3:
            run.font.size = Pt(10.5)
            run.font.color.rgb = DARK_SLATE
        return h

    def add_body_p(text, bold_prefix=None, space_after=5):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            bp = p.add_run(bold_prefix)
            bp.font.name = "Segoe UI"
            bp.font.bold = True
            bp.font.color.rgb = PRIMARY
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(10)
        r.font.color.rgb = DARK_SLATE
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        bp = p.add_run(bold_prefix)
        bp.font.name = "Segoe UI"
        bp.font.bold = True
        bp.font.color.rgb = PRIMARY
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(10)
        r.font.color.rgb = DARK_SLATE
        return p

    # --- SECTION 1: EXECUTIVE SUMMARY ---
    add_custom_heading("1. Executive Summary")
    add_body_p(
        "Every software engineer knows the dreaded 'Week One' feeling: cloning an unfamiliar monolithic repository with hundreds of source files, opening an outdated README.md, spending days struggling with environment setup, and hesitating to interrupt senior developers every twenty minutes. While generic AI copilots like ChatGPT or standard GitHub Copilot can explain isolated code snippets, they suffer from fundamental contextual amnesia—they don't know what you already understand, they forget yesterday's conversation, and they treat senior engineers and junior interns identically."
    )
    add_body_p(
        "Onboarding Buddy bridges this gap. Built by Team UltronX, Onboarding Buddy is an end-to-end developer onboarding platform providing a dual-interface experience (native VS Code Extension + responsive React Web Workspace). Powered by Groq for high-speed inference, Hindsight for dual-bank persistent memory, and MongoDB Atlas for multi-tenant state, it acts as a tireless senior mentor that remembers your journey and adapts to your exact learning velocity."
    )

    # --- SECTION 2: THE PROBLEM ---
    add_custom_heading("2. The Problem: The High Cost of Developer Ramp-Up")
    add_body_p("Engineering organizations face severe friction during developer onboarding:")
    add_bullet("Fragmented Knowledge & Tribal Wisdom: ", "Crucial architectural decisions, quirks, and debugging patterns reside in Slack threads, stale documentation, or the heads of a few senior engineers.")
    add_bullet("Senior Engineer Distraction: ", "Lead developers spend 20–30% of their sprints answering repetitive setup and architectural questions instead of shipping high-impact features.")
    add_bullet("The Contextual Amnesia of Generic AI: ", "When developers ask an LLM 'How does token refresh work?' on Monday, and 'How does this affect database session cleanup?' on Wednesday, the LLM starts from scratch, re-explaining basic concepts.")
    add_bullet("The Assessment Gap: ", "There is no automated, stress-free way to verify whether a new hire truly understands the codebase logic before they submit their first pull request.")

    # --- SECTION 3: THE SOLUTION ---
    add_custom_heading("3. The Solution: What We Built")
    add_body_p("Onboarding Buddy is built upon four foundational pillars:")
    
    add_bullet("1. Dual-Interface Experience: ", "Accessible directly inside VS Code as an activity-bar panel (.vsix) or via a responsive modern React Web Dashboard. Developers can inspect code, upload folders, and ask questions without context-switching.")
    add_bullet("2. Dual-Bank Hindsight Memory: ", "Segregates cognitive tracking into two dedicated memory banks: Personal Developer Bank (dev-<user>) for personal confusion and progress, and Project Intelligence Bank (prj-<repo>) for collective codebase wisdom.")
    add_bullet("3. Adaptive Persona Engine: ", "Supports three distinct mentoring styles: Friendly Mentor (encouraging, step-by-step), Strict Senior (production-grade, performance, and edge-case focus), and Explain-Like-I'm-5 (high-level analogies).")
    add_bullet("4. Interactive Code Comprehension Quizzes: ", "Dynamically generates contextual multiple-choice assessments from real repository files. Missed topics are automatically recorded back into Hindsight memory.")

    # --- SECTION 4: ARCHITECTURE ---
    add_custom_heading("4. System Architecture & Dual-Bank Memory Flow")
    add_body_p(
        "Onboarding Buddy operates as a decoupled, microservices-ready full-stack architecture:"
    )

    # Architecture Table
    arch_table = doc.add_table(rows=5, cols=3)
    arch_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Layer", "Technologies", "Responsibilities"]
    col_widths = [Inches(1.5), Inches(2.2), Inches(3.2)]
    
    # Header format
    hdr_cells = arch_table.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], HEX_PRIMARY)
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.name = "Segoe UI"
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)
            r.font.size = Pt(9.5)

    arch_rows = [
        ("Client Tier", "VS Code Extension API, Vite, React 18, Lucide React", "Interactive chat, AST tree explorer, dynamic quiz taker, memory analytics hub, and project sync."),
        ("Application Core", "FastAPI (Python 3.11), Uvicorn, Motor (Async MongoDB)", "AST token-efficient file pruning, dual-bank memory routing, GitHub OAuth, persona formatting, and quiz generation."),
        ("Intelligence Tier", "Groq (openai/gpt-oss-120b & Llama 3.3), Hindsight AI", "Sub-second LLM reasoning, long-term semantic memory recall & retention across sessions."),
        ("Data Persistence", "MongoDB Atlas (Cloud Managed)", "Multi-workspace file storage, developer profiles, historical chat transcripts, and quiz analytics.")
    ]

    for row_idx, data in enumerate(arch_rows, start=1):
        row_cells = arch_table.rows[row_idx].cells
        bg_col = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(data):
            row_cells[col_idx].text = text
            row_cells[col_idx].width = col_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_col)
            set_cell_margins(row_cells[col_idx], top=80, bottom=80, left=100, right=100)
            p = row_cells[col_idx].paragraphs[0]
            p.runs[0].font.name = "Segoe UI"
            p.runs[0].font.size = Pt(9)
            p.runs[0].font.color.rgb = DARK_SLATE
            if col_idx == 0:
                p.runs[0].font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Dual Memory Breakdown
    add_custom_heading("The Dual-Bank Memory Advantage", level=2)
    add_body_p(
        "Standard RAG and chat applications suffer because they mix personal queries with global codebase knowledge. Onboarding Buddy solves this through strict separation:"
    )
    add_bullet("Personal Developer Bank (dev-<developer_id>): ", "Remembers the engineer's skill level, previous questions, missed quiz concepts, and preferences. Ensures the mentor never explains basic concepts twice if already mastered.")
    add_bullet("Project Intelligence Bank (prj-<workspace_name>): ", "Accumulates shared architectural patterns, known gotchas, and dependencies discovered by all engineers working in the repository. As new engineers ask questions, the collective repository IQ increases for everyone.")

    # --- SECTION 5: TECHNICAL CHALLENGES ---
    add_custom_heading("5. Engineering Challenges & Technical Innovations")

    add_body_p("During the hackathon, our team overcame several critical engineering hurdles:", space_after=3)

    add_bullet("Overcoming the Token Limit (Groq TPM Caps): ", "Passing an entire codebase into an LLM context rapidly triggers 413 Rate Limit errors (8,000 TPM cap). We engineered a token-efficient chunking pipeline: file content is constrained to 4,000 character windows per relevant source module, node_modules and binaries are pruned, and past conversations are condensed into dense 1-sentence memory facts.")

    add_bullet("Dual-Layer Cross-Origin Session Resiliency: ", "When hosting frontend on Vercel and backend on Render, third-party cookie restrictions (SameSite Lax) cause silent authentication loss. We implemented a hybrid authentication system: the backend issues SameSite=None; Secure cookies while also passing a session_token stored in localStorage and delivered via an X-Session-Token header on every request.")

    add_bullet("Eliminating External API Timeout Bottlenecks: ", "Relying on external GitHub /user calls during high-frequency project syncing caused httpx.ReadTimeout crashes. We introduced an internal MongoDB session cache check that resolves active developer credentials in < 5ms, bypassing external network latency completely.")

    # --- SECTION 6: WHAT WE LEARNED ---
    add_custom_heading("6. Key Learnings")
    add_bullet("Memory Outperforms Context Size: ", "Massive context windows are slow and costly. Compact, long-term memory banks produce significantly more consistent and personal mentor interactions.")
    add_bullet("Meet Developers Where They Work: ", "Providing a native VS Code panel alongside the web dashboard proved essential. Developers rarely want to switch away from their editor to read onboarding documentation.")
    add_bullet("Active Recall Drives True Comprehension: ", "Combining personalized chat with automated code quizzes transformed passive documentation reading into verifiable, active learning.")

    # --- SECTION 7: TEAM DETAILS ---
    add_custom_heading("7. Team UltronX & Contributions")
    add_body_p("Onboarding Buddy was conceived, architected, and built by Team UltronX:")

    team_table = doc.add_table(rows=7, cols=3)
    team_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_headers = ["Team Member", "Role", "Key Engineering Contributions"]
    t_widths = [Inches(1.8), Inches(1.8), Inches(3.3)]

    t_hdr_cells = team_table.rows[0].cells
    for i, h_text in enumerate(t_headers):
        t_hdr_cells[i].text = h_text
        t_hdr_cells[i].width = t_widths[i]
        set_cell_background(t_hdr_cells[i], HEX_ACCENT)
        set_cell_margins(t_hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = t_hdr_cells[i].paragraphs[0]
        for r in p.runs:
            r.font.name = "Segoe UI"
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)
            r.font.size = Pt(9.5)

    team_data = [
        ("Haider S Vadgamwala", "Lead Architect & Backend", "FastAPI architecture, Groq & Hindsight dual memory orchestration, cross-origin auth engine, and project sync."),
        ("Soha Iffat", "Frontend & UX Lead", "Modern React dashboard design, persona selector popover, responsive mobile sidebars, and Light/Dark themes."),
        ("Bharath G", "Extension Engineer", "VS Code Extension API development, workspace AST file collection, .vsix packaging, and editor commands."),
        ("N Chaitanya", "Database & Data Modeling", "MongoDB Atlas multi-tenant schemas, session management, project indexing, and safe deletion logic."),
        ("Lavanya V", "Assessment & Learning Logic", "Dynamic code quiz generation engine, scoring algorithms, and missed-concept feedback loops."),
        ("Sammy M", "DevOps & Quality Assurance", "Render & Vercel deployment automation, environment management, end-to-end integration testing, and documentation.")
    ]

    for row_idx, data in enumerate(team_data, start=1):
        row_cells = team_table.rows[row_idx].cells
        bg_col = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(data):
            row_cells[col_idx].text = text
            row_cells[col_idx].width = t_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_col)
            set_cell_margins(row_cells[col_idx], top=80, bottom=80, left=100, right=100)
            p = row_cells[col_idx].paragraphs[0]
            p.runs[0].font.name = "Segoe UI"
            p.runs[0].font.size = Pt(9)
            p.runs[0].font.color.rgb = DARK_SLATE
            if col_idx == 0:
                p.runs[0].font.bold = True
            elif col_idx == 1:
                p.runs[0].font.color.rgb = ACCENT

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- SECTION 8: CONCLUSION ---
    add_custom_heading("8. Conclusion & Future Roadmap")
    add_body_p(
        "Onboarding Buddy turns developer onboarding from an isolating, intimidating experience into an active, intelligent conversation. By unifying ultra-fast LLM inference with persistent dual-bank memory, we created a mentor that doesn't just answer questions—it grows alongside the developer and the team."
    )
    add_body_p("Future enhancements on our roadmap include automated pull-request reviews with mentorship comments, interactive in-browser sandboxes for code quizzes, and team-wide onboarding analytics for engineering leaders.")

    # Save to both paths
    output_path = r"C:\Users\haide\OneDrive\Documents\Onboarding Buddy\Onboarding-Buddy\HACKATHON_SUBMISSION.docx"
    artifact_path = r"C:\Users\haide\.gemini\antigravity\brain\ca69ac1a-e5a7-4b0a-a580-2550d58d04ed\HACKATHON_SUBMISSION.docx"

    doc.save(output_path)
    doc.save(artifact_path)
    print(f"Successfully generated DOCX at:\n{output_path}\n{artifact_path}")

if __name__ == "__main__":
    create_document()

