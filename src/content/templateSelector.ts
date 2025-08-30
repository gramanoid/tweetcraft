/**
 * Template Selector UI for TweetCraft v0.0.9
 * Provides an interface for selecting and using templates
 */

import { PresetTemplate, PresetTemplates } from './presetTemplates';
import { CustomTemplate, CustomTemplateManager } from './customTemplates';
import { ToneOption } from './toneSelector';

export class TemplateSelector {
  private container: HTMLElement | null = null;
  private isOpen = false;
  private selectedTemplate: PresetTemplate | CustomTemplate | null = null;
  private selectedTone: ToneOption | null = null;
  private onSelectCallback: ((template: PresetTemplate | CustomTemplate, tone: ToneOption) => void) | null = null;
  
  // Define tones inline to avoid circular dependencies
  private static readonly TONE_OPTIONS: ToneOption[] = [
    { id: 'professional', emoji: '💼', label: 'Pro', description: 'Professional', systemPrompt: 'Professional tone - be formal, respectful, and business-appropriate' },
    { id: 'casual', emoji: '😊', label: 'Casual', description: 'Friendly', systemPrompt: 'Casual tone - be friendly, approachable, and conversational' },
    { id: 'witty', emoji: '😄', label: 'Witty', description: 'Humorous', systemPrompt: 'Witty tone - be clever, humorous, and entertaining while staying respectful' },
    { id: 'supportive', emoji: '🤗', label: 'Support', description: 'Encouraging', systemPrompt: 'Supportive tone - be encouraging, empathetic, and helpful' },
    { id: 'enthusiastic', emoji: '🎉', label: 'Excited', description: 'Energetic', systemPrompt: 'Enthusiastic tone - be energetic, passionate, and excited about the topic' },
    { id: 'academic', emoji: '🎓', label: 'Academic', description: 'Scholarly', systemPrompt: 'Academic tone - be analytical, evidence-based, and intellectually rigorous' },
    { id: 'contrarian', emoji: '🤔', label: 'Counter', description: 'Challenging', systemPrompt: 'Contrarian tone - respectfully challenge or provide alternative perspectives' },
    { id: 'skeptical', emoji: '🤨', label: 'Skeptic', description: 'Questioning', systemPrompt: 'Skeptical tone - question claims, ask for evidence, express healthy doubt' },
    { id: 'sarcastic', emoji: '😏', label: 'Sarcastic', description: 'Ironic', systemPrompt: 'Sarcastic tone - use irony and sarcasm, but avoid being mean-spirited' },
    { id: 'provocative', emoji: '🔥', label: 'Spicy', description: 'Bold', systemPrompt: 'Provocative tone - be bold, controversial, and thought-provoking while staying within bounds' },
    { id: 'dismissive', emoji: '🙄', label: 'Dismissive', description: 'Critical', systemPrompt: 'Dismissive tone - express that you find the point unimpressive or obvious' }
  ];
  
  constructor() {
    // Initialize custom templates
    CustomTemplateManager.init();
  }
  
  /**
   * Create the template selector UI
   */
  private createUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'template-selector-container';
    container.style.cssText = `
      position: absolute;
      background: #15202b;
      border: 1px solid #38444d;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      width: 360px;
      max-height: 320px;
      overflow-y: auto;
      z-index: 10000;
      display: none;
    `;
    
    // Add header
    const header = document.createElement('div');
    header.className = 'template-selector-header';
    header.style.cssText = `
      padding: 10px 14px;
      border-bottom: 1px solid #38444d;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #192734;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Reply Templates';
    title.style.cssText = `
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      color: #8899a6;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      transition: color 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#ffffff';
    closeBtn.onmouseout = () => closeBtn.style.color = '#8899a6';
    closeBtn.onclick = () => this.close();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    container.appendChild(header);
    
    // Add tabs for preset vs custom
    const tabs = document.createElement('div');
    tabs.className = 'template-tabs';
    tabs.style.cssText = `
      display: flex;
      border-bottom: 1px solid #38444d;
      background: #192734;
    `;
    
    const presetTab = this.createTab('Presets', true);
    const customTab = this.createTab('Custom', false);
    
    presetTab.onclick = () => {
      presetTab.classList.add('active');
      customTab.classList.remove('active');
      this.showPresetTemplates(content);
    };
    
    customTab.onclick = () => {
      customTab.classList.add('active');
      presetTab.classList.remove('active');
      this.showCustomTemplates(content);
    };
    
    tabs.appendChild(presetTab);
    tabs.appendChild(customTab);
    container.appendChild(tabs);
    
    // Add content area
    const content = document.createElement('div');
    content.className = 'template-content';
    content.style.cssText = `
      padding: 4px;
      max-height: 200px;
      overflow-y: auto;
    `;
    container.appendChild(content);
    
    // Show preset templates by default
    this.showPresetTemplates(content);
    
    // Add create custom button at bottom
    const footer = document.createElement('div');
    footer.className = 'template-footer';
    footer.style.cssText = `
      padding: 10px 14px;
      border-top: 1px solid #38444d;
      background: #192734;
    `;
    
    const createBtn = document.createElement('button');
    createBtn.textContent = '+ Create Custom Template';
    createBtn.style.cssText = `
      width: 100%;
      padding: 6px 12px;
      background: #1da1f2;
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    `;
    createBtn.onmouseover = () => createBtn.style.background = '#1a8cd8';
    createBtn.onmouseout = () => createBtn.style.background = '#1da1f2';
    createBtn.onclick = () => this.openTemplateCreator();
    
    footer.appendChild(createBtn);
    container.appendChild(footer);
    
    return container;
  }
  
  /**
   * Create a tab button
   */
  private createTab(label: string, isActive: boolean): HTMLElement {
    const tab = document.createElement('button');
    tab.className = isActive ? 'tab active' : 'tab';
    tab.textContent = label;
    tab.style.cssText = `
      flex: 1;
      padding: 8px;
      background: ${isActive ? '#15202b' : 'transparent'};
      border: none;
      border-bottom: ${isActive ? '2px solid #1da1f2' : 'none'};
      color: ${isActive ? '#1da1f2' : '#8899a6'};
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
    return tab;
  }
  
  /**
   * Show preset templates
   */
  private showPresetTemplates(container: HTMLElement): void {
    container.innerHTML = '';
    
    // Access the DEFAULT_PRESETS directly (now public)
    const templates = PresetTemplates.DEFAULT_PRESETS || [];
    const categories = ['engagement', 'value', 'conversation', 'humor'];
    
    categories.forEach(category => {
      const categoryTemplates = templates.filter((t: PresetTemplate) => t.category === category);
      if (categoryTemplates.length === 0) return;
      
      // Add category header
      const categoryHeader = document.createElement('div');
      categoryHeader.style.cssText = `
        padding: 6px 10px 2px;
        font-size: 11px;
        font-weight: 600;
        color: #8899a6;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      categoryHeader.textContent = category;
      container.appendChild(categoryHeader);
      
      // Add templates
      categoryTemplates.forEach((template: PresetTemplate) => {
        container.appendChild(this.createTemplateItem(template));
      });
    });
  }
  
  /**
   * Show custom templates
   */
  private showCustomTemplates(container: HTMLElement): void {
    container.innerHTML = '';
    
    const templates = CustomTemplateManager.getTemplates();
    
    if (templates.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        padding: 24px;
        text-align: center;
        color: #8899a6;
      `;
      emptyState.innerHTML = `
        <div style="font-size: 36px; margin-bottom: 12px;">📝</div>
        <div style="font-size: 14px; margin-bottom: 6px; color: #ffffff;">No custom templates yet</div>
        <div style="font-size: 12px; color: #8899a6;">Create your own templates for frequently used reply patterns</div>
      `;
      container.appendChild(emptyState);
      return;
    }
    
    templates.forEach(template => {
      const item = this.createTemplateItem(template);
      
      // Add edit/delete buttons for custom templates
      const actions = document.createElement('div');
      actions.style.cssText = `
        display: flex;
        gap: 6px;
        margin-top: 4px;
      `;
      
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.cssText = `
        padding: 3px 10px;
        background: #253341;
        border: 1px solid #38444d;
        border-radius: 10px;
        font-size: 11px;
        color: #8899a6;
        cursor: pointer;
        transition: all 0.2s;
      `;
      editBtn.onmouseover = () => {
        editBtn.style.background = '#1da1f2';
        editBtn.style.color = '#ffffff';
      };
      editBtn.onmouseout = () => {
        editBtn.style.background = '#253341';
        editBtn.style.color = '#8899a6';
      };
      editBtn.onclick = (e) => {
        e.stopPropagation();
        this.editTemplate(template);
      };
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.cssText = `
        padding: 3px 10px;
        background: #3d2222;
        border: 1px solid #5c2b2b;
        border-radius: 10px;
        font-size: 11px;
        color: #e0697a;
        cursor: pointer;
        transition: all 0.2s;
      `;
      deleteBtn.onmouseover = () => {
        deleteBtn.style.background = '#5c2b2b';
        deleteBtn.style.color = '#ff6b6b';
      };
      deleteBtn.onmouseout = () => {
        deleteBtn.style.background = '#3d2222';
        deleteBtn.style.color = '#e0697a';
      };
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Delete template "${template.name}"?`)) {
          await CustomTemplateManager.deleteTemplate(template.id);
          this.showCustomTemplates(container);
        }
      };
      
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      item.appendChild(actions);
      
      container.appendChild(item);
    });
  }
  
  /**
   * Create a template item
   */
  private createTemplateItem(template: PresetTemplate | CustomTemplate): HTMLElement {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.style.cssText = `
      padding: 8px 10px;
      margin: 2px 4px;
      background: #192734;
      border: 1px solid #38444d;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    `;
    
    item.onmouseover = () => {
      item.style.background = '#1e2732';
      item.style.borderColor = '#1da1f2';
    };
    
    item.onmouseout = () => {
      item.style.background = '#192734';
      item.style.borderColor = '#38444d';
    };
    
    item.onclick = () => {
      this.selectTemplate(template);
    };
    
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    `;
    
    const emoji = document.createElement('span');
    emoji.textContent = template.emoji;
    emoji.style.fontSize = '16px';
    
    const name = document.createElement('span');
    name.textContent = template.name;
    name.style.cssText = `
      font-weight: 600;
      color: #ffffff;
      font-size: 13px;
    `;
    
    header.appendChild(emoji);
    header.appendChild(name);
    item.appendChild(header);
    
    const description = document.createElement('div');
    description.textContent = template.description;
    description.style.cssText = `
      font-size: 12px;
      color: #8899a6;
      margin-bottom: 2px;
      line-height: 1.3;
    `;
    item.appendChild(description);
    
    // Show example or pattern for custom templates
    if ('pattern' in template && template.pattern) {
      const pattern = document.createElement('div');
      pattern.textContent = `Pattern: ${template.pattern}`;
      pattern.style.cssText = `
        font-size: 11px;
        color: #657786;
        font-style: italic;
        margin-top: 2px;
      `;
      item.appendChild(pattern);
    }
    
    // Show usage count for custom templates
    if ('usageCount' in template) {
      const usage = document.createElement('div');
      usage.textContent = `Used ${template.usageCount} times`;
      usage.style.cssText = `
        font-size: 10px;
        color: #657786;
        margin-top: 2px;
      `;
      item.appendChild(usage);
    }
    
    return item;
  }
  
  /**
   * Select a template and show tone selection
   */
  private selectTemplate(template: PresetTemplate | CustomTemplate): void {
    this.selectedTemplate = template;
    
    // Show tone selector instead of immediately closing
    this.showToneSelector();
  }
  
  /**
   * Show tone selector after template selection
   */
  private showToneSelector(): void {
    if (!this.container) return;
    
    // Update header
    const header = this.container.querySelector('.template-selector-header h3');
    if (header && this.selectedTemplate) {
      header.textContent = `${this.selectedTemplate.emoji} ${this.selectedTemplate.name} - Choose Tone`;
    }
    
    // Clear content and show tones
    const content = this.container.querySelector('.template-content') as HTMLElement;
    if (!content) return;
    
    content.innerHTML = '';
    
    // Add back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Templates';
    backBtn.style.cssText = `
      width: calc(100% - 8px);
      margin: 4px;
      padding: 6px 12px;
      background: #253341;
      color: #8899a6;
      border: 1px solid #38444d;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    backBtn.onmouseover = () => {
      backBtn.style.background = '#1e2732';
      backBtn.style.color = '#ffffff';
    };
    backBtn.onmouseout = () => {
      backBtn.style.background = '#253341';
      backBtn.style.color = '#8899a6';
    };
    backBtn.onclick = () => {
      // Go back to template selection
      const tabs = this.container?.querySelector('.template-tabs .tab.active') as HTMLElement;
      if (tabs?.textContent === 'Custom') {
        this.showCustomTemplates(content);
      } else {
        this.showPresetTemplates(content);
      }
      // Reset header
      if (header) {
        header.textContent = 'Reply Templates';
      }
    };
    content.appendChild(backBtn);
    
    // Add tone grid
    const toneGrid = document.createElement('div');
    toneGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      padding: 4px;
    `;
    
    TemplateSelector.TONE_OPTIONS.forEach(tone => {
      const toneBtn = document.createElement('button');
      toneBtn.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 4px;
        background: #192734;
        border: 1px solid #38444d;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      `;
      
      const emoji = document.createElement('div');
      emoji.textContent = tone.emoji;
      emoji.style.cssText = `
        font-size: 20px;
        margin-bottom: 2px;
      `;
      
      const label = document.createElement('div');
      label.textContent = tone.label;
      label.style.cssText = `
        font-size: 11px;
        color: #ffffff;
        font-weight: 600;
      `;
      
      const desc = document.createElement('div');
      desc.textContent = tone.description;
      desc.style.cssText = `
        font-size: 9px;
        color: #8899a6;
        margin-top: 1px;
      `;
      
      toneBtn.appendChild(emoji);
      toneBtn.appendChild(label);
      toneBtn.appendChild(desc);
      
      toneBtn.onmouseover = () => {
        toneBtn.style.background = '#1e2732';
        toneBtn.style.borderColor = '#1da1f2';
      };
      
      toneBtn.onmouseout = () => {
        toneBtn.style.background = '#192734';
        toneBtn.style.borderColor = '#38444d';
      };
      
      toneBtn.onclick = () => {
        this.selectedTone = tone;
        this.finalizeSelection();
      };
      
      toneGrid.appendChild(toneBtn);
    });
    
    content.appendChild(toneGrid);
  }
  
  /**
   * Finalize selection with both template and tone
   */
  private finalizeSelection(): void {
    if (!this.selectedTemplate || !this.selectedTone) return;
    
    // Track usage for custom templates
    if ('isCustom' in this.selectedTemplate && this.selectedTemplate.isCustom) {
      CustomTemplateManager.trackUsage(this.selectedTemplate.id);
    }
    
    // Call the callback with both template and tone
    if (this.onSelectCallback) {
      this.onSelectCallback(this.selectedTemplate, this.selectedTone);
    }
    
    this.close();
  }
  
  /**
   * Open template creator/editor
   */
  private openTemplateCreator(template?: CustomTemplate): void {
    // This would open a modal to create/edit templates
    // For now, we'll use a simple prompt
    const name = prompt('Template name:', template?.name || '') || '';
    if (!name) return;
    
    const pattern = prompt('Template pattern (use {variable} for placeholders):', 
      template?.pattern || CustomTemplateManager.TEMPLATE_PATTERNS.THANKS_SHARE) || '';
    if (!pattern) return;
    
    const description = prompt('Description:', template?.description || '') || '';
    
    if (template) {
      CustomTemplateManager.updateTemplate(template.id, {
        name,
        pattern,
        description,
        variables: this.extractVariables(pattern)
      });
    } else {
      CustomTemplateManager.createTemplate({
        name,
        pattern,
        description,
        variables: this.extractVariables(pattern),
        emoji: '📝',
        category: 'engagement'
      });
    }
    
    // Refresh the view
    const content = this.container?.querySelector('.template-content') as HTMLElement;
    if (content) {
      this.showCustomTemplates(content);
    }
  }
  
  /**
   * Edit existing template
   */
  private editTemplate(template: CustomTemplate): void {
    this.openTemplateCreator(template);
  }
  
  /**
   * Extract variables from a pattern
   */
  private extractVariables(pattern: string): string[] {
    const matches = pattern.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.slice(1, -1));
  }
  
  /**
   * Show the template selector
   */
  public show(anchor: HTMLElement, onSelect: (template: PresetTemplate | CustomTemplate, tone: ToneOption) => void): void {
    if (!this.container) {
      this.container = this.createUI();
      document.body.appendChild(this.container);
      // Container will be cleaned up when closed
    }
    
    this.onSelectCallback = onSelect;
    
    // Position relative to anchor
    const rect = anchor.getBoundingClientRect();
    this.container.style.top = `${rect.bottom + 5}px`;
    this.container.style.left = `${rect.left}px`;
    this.container.style.display = 'block';
    
    this.isOpen = true;
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);
  }
  
  /**
   * Close the template selector
   */
  public close(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.isOpen = false;
    document.removeEventListener('click', this.handleOutsideClick);
  }
  
  /**
   * Handle outside clicks
   */
  private handleOutsideClick = (e: MouseEvent): void => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.close();
    }
  };
  
  /**
   * Check if selector is open
   */
  public isVisible(): boolean {
    return this.isOpen;
  }
}