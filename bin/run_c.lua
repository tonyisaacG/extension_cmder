-- Clink Tab-Autocomplete for run_c, pass_c, and val_c
-- Allows pressing Tab to auto-suggest and complete saved scripts and vault keys

local function get_run_c_scripts()
    local matches = {}
    local container_dir = os.getenv("CMDER_CONTAINER_DIR") or "E:\\2026\\MyBigProjects_SimpleLib\\extension_cmder"
    local scripts_dir = container_dir .. "\\user_scripts"
    local cmd = 'dir /b "' .. scripts_dir .. '\\*.bat" "' .. scripts_dir .. '\\*.cmd" 2>nul'
    local p = io.popen(cmd)
    if p then
        for file in p:lines() do
            local name = file:match("^(.-)%.[bc][am][td]$")
            if name then
                table.insert(matches, name)
            end
        end
        p:close()
    end
    return matches
end

local function get_vault_keys()
    local matches = {}
    local container_dir = os.getenv("CMDER_CONTAINER_DIR") or "E:\\2026\\MyBigProjects_SimpleLib\\extension_cmder"
    local cli_path = container_dir .. "\\bin\\vault_cli.js"
    local cmd = 'node "' .. cli_path .. '" keys 2>nul'
    local p = io.popen(cmd)
    if p then
        for line in p:lines() do
            local key = line:match("^%s*(.-)%s*$")
            if key and #key > 0 then
                table.insert(matches, key)
            end
        end
        p:close()
    end
    return matches
end

if clink and clink.argmatcher then
    clink.argmatcher("run_c"):addarg({get_run_c_scripts}):nofiles()
    clink.argmatcher("pass_c"):addarg({get_vault_keys}):nofiles()
    clink.argmatcher("val_c"):addarg({get_vault_keys}):nofiles()
end
