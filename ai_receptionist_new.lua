local uuid = argv[1]
local caller_number = argv[2]
local api_base = "https://www.unifyline.com/api/receptionist"
local record_file = "/tmp/caller_" .. uuid .. ".wav"

freeswitch.consoleLog("INFO", "[AI Receptionist] Call started: " .. uuid .. " from " .. caller_number .. "\n")

session:answer()
session:sleep(1000)

local max_turns = 10
local turn = 0
local first_turn = true

while session:ready() and turn < max_turns do
    turn = turn + 1

    -- Build request
    local body
    if first_turn then
        first_turn = false
        body = '{"call_uuid":"' .. uuid .. '","caller_id_number":"' .. caller_number .. '","action":"greet"}'
    else
        -- Check recorded file
        local f = io.open(record_file, "rb")
        if not f then
            body = '{"call_uuid":"' .. uuid .. '","caller_id_number":"' .. caller_number .. '","action":"silence"}'
        else
            local size = f:seek("end")
            f:close()
            if size < 5000 then
                body = '{"call_uuid":"' .. uuid .. '","caller_id_number":"' .. caller_number .. '","action":"silence"}'
            else
                -- Send audio file directly via multipart
                local response_json = "/tmp/resp_" .. uuid .. "_" .. turn .. ".json"
                local response_audio = "/tmp/response_" .. uuid .. "_" .. turn .. ".wav"
                local curl_cmd = string.format(
                    "curl -s -X POST '%s/respond' -F call_uuid=%s -F caller_id_number=%s -F audio=@%s -o %s 2>/dev/null",
                    api_base, uuid, caller_number, record_file, response_json
                )
                os.execute(curl_cmd)
                
                -- Extract audio_b64 and save as wav
                local extract_cmd = string.format(
                    "python3 -c \"import json,base64; d=json.load(open('%s')); open('%s','wb').write(base64.b64decode(d['audio_b64']))\" 2>/dev/null",
                    response_json, response_audio
                )
                os.execute(extract_cmd)
                
                -- Play response
                if session:ready() then
                    local rf = io.open(response_audio, "rb")
                    if rf then
                        local rsize = rf:seek("end")
                        rf:close()
                        if rsize and rsize > 1000 then
                            session:execute("playback", response_audio)
                        end
                    end
                end
                os.remove(response_json)
                os.remove(response_audio)
                
                -- Record next caller input (longer timeout, lower silence threshold)
                if session:ready() then
                    session:execute("record", record_file .. " 15 200 3")
                end
                goto continue
            end
        end
    end

    -- Handle greet or silence actions
    local response_audio = "/tmp/response_" .. uuid .. "_" .. turn .. ".wav"
    local response_json = "/tmp/resp_" .. uuid .. "_" .. turn .. ".json"
    local curl_cmd = string.format(
        "curl -s -X POST '%s/respond' -H 'Content-Type: application/json' -d '%s' -o %s 2>/dev/null",
        api_base, body, response_json
    )
    os.execute(curl_cmd)
    
    local extract_cmd = string.format(
        "python3 -c \"import json,base64; d=json.load(open('%s')); open('%s','wb').write(base64.b64decode(d['audio_b64']))\" 2>/dev/null",
        response_json, response_audio
    )
    os.execute(extract_cmd)
    
    if session:ready() then
        local rf = io.open(response_audio, "rb")
        if rf then
            local rsize = rf:seek("end")
            rf:close()
            if rsize and rsize > 1000 then
                session:execute("playback", response_audio)
            end
        end
    end
    os.remove(response_json)
    os.remove(response_audio)

    -- Record caller response
    if session:ready() then
        session:execute("record", record_file .. " 15 200 3")
    end

    ::continue::
end

-- End call
os.execute(string.format(
    "curl -s -X POST '%s/respond' -H 'Content-Type: application/json' -d '{\"call_uuid\":\"%s\",\"caller_id_number\":\"%s\",\"action\":\"end\"}' > /dev/null 2>&1 &",
    api_base, uuid, caller_number
))
os.remove(record_file)
freeswitch.consoleLog("INFO", "[AI Receptionist] Call ended: " .. uuid .. "\n")
