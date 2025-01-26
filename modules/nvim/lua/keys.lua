-- Clear highlights on search when pressing <Esc> in normal mode
--  See `:help hlsearch`
vim.keymap.set('n', '<Esc>', '<cmd>nohlsearch<CR>')

-- Diagnostic keymaps
vim.keymap.set('n', '<leader>q', vim.diagnostic.setloclist, { desc = 'Open diagnostic [Q]uickfix list' })

-- Exit terminal mode in the builtin terminal with a shortcut that is a bit easier
-- for people to discover. Otherwise, you normally need to press <C-\><C-n>, which
-- is not what someone will guess without a bit more experience.
vim.keymap.set('t', '<Esc><Esc>', '<C-\\><C-n>', { desc = 'Exit terminal mode' })

-- Keybinds to make split navigation easier.
--  See `:help wincmd` for a list of all window commands
vim.keymap.set('n', '<C-h>', '<C-w><C-h>', { desc = 'Move focus to the left window' })
vim.keymap.set('n', '<C-l>', '<C-w><C-l>', { desc = 'Move focus to the right window' })
vim.keymap.set('n', '<C-j>', '<C-w><C-j>', { desc = 'Move focus to the lower window' })
vim.keymap.set('n', '<C-k>', '<C-w><C-k>', { desc = 'Move focus to the upper window' })

vim.keymap.set('n', 'gn', '<cmd>bn<CR>', { desc = 'Go to next buffer' })
vim.keymap.set('n', 'gp', '<cmd>bp<CR>', { desc = 'Go to previous buffer' })

-- Plugin key configuration
vim.g.config_keys = {
  telescope = function()
    local builtin = require 'telescope.builtin'
    vim.keymap.set('n', '<leader>f', builtin.find_files, { desc = '[F]iles' })
    vim.keymap.set('n', '<leader>b', builtin.buffers, { desc = '[B]uffers' })
    vim.keymap.set('n', '<leader>d', builtin.diagnostics, { desc = '[D]iagnostics' })
    vim.keymap.set('n', '<leader>?', builtin.help_tags, { desc = '[?] Help' })
    vim.keymap.set('n', '<leader>/', builtin.current_buffer_fuzzy_find, { desc = '[/] Fuzzily search in current buffer' })
  end,
  lsp = function(attach_evt)
    local map = function(keys, func, desc, mode)
      mode = mode or 'n'
      vim.keymap.set(mode, keys, func, { buffer = attach_evt.buf, desc = 'LSP: ' .. desc })
    end
    local telescope_builtin = require 'telescope.builtin'
    map('gd', telescope_builtin.lsp_definitions, '[G]oto [D]efinition')
    map('gD', vim.lsp.buf.declaration, '[G]oto [D]eclaration')
    map('gr', telescope_builtin.lsp_references, '[G]oto [R]eferences')
    map('gI', telescope_builtin.lsp_implementations, '[G]oto [I]mplementation')
    map('<leader>s', telescope_builtin.lsp_document_symbols, 'Document [S]ymbols')
    map('<leader>S', telescope_builtin.lsp_dynamic_workspace_symbols, 'Workspace [S]ymbols')
    map('<leader>r', vim.lsp.buf.rename, '[R]ename')
    map('<leader>a', vim.lsp.buf.code_action, 'Code [A]ction', { 'n', 'x' })

    -- The following code creates a keymap to toggle inlay hints in your
    -- code, if the language server you are using supports them
    --
    -- This may be unwanted, since they displace some of your code
    local client = vim.lsp.get_client_by_id(attach_evt.data.client_id)
    if client and client.supports_method(vim.lsp.protocol.Methods.textDocument_inlayHint) then
      map('<leader>th', function()
        vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled { bufnr = attach_evt.buf })
      end, '[T]oggle Inlay [H]ints')
    end
  end,
  cmp = function()
    local cmp = require 'cmp'
    -- For an understanding of why these mappings were
    -- chosen, you will need to read `:help ins-completion`
    return {
      ['<C-b>'] = cmp.mapping.scroll_docs(-4),
      ['<C-f>'] = cmp.mapping.scroll_docs(4),

      ['<CR>'] = cmp.mapping.confirm { select = true },
      ['<Tab>'] = cmp.mapping.select_next_item(),
      ['<S-Tab>'] = cmp.mapping.select_prev_item(),
    }
  end,
}
