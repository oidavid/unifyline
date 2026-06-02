// SIP Configuration for UnifyLine WebRTC
// Save as src/lib/sip-config.ts
export const SIP_CONFIG = {
  server: '198.58.114.103',
  wsPort: 5066,
  wssPort: 7443,
  domain: '198.58.114.103',
  extensions: {
    '100': { password: 'UL100secure!', name: 'Main Reception', did: '4045925562' },
    '101': { password: 'UL101secure!', name: 'Sales', did: '4045929690' },
    '102': { password: 'UL102secure!', name: 'Support', did: '4045925562' },
    '103': { password: 'UL103secure!', name: 'Management', did: '4045925562' },
    '104': { password: 'UL104secure!', name: 'CEO Direct', did: '6784605180' },
  },
  ringGroups: {
    '2000': 'All Staff',
    '2001': 'Sales Team',
    '2002': 'Support Team',
    '2003': 'Management',
  }
}
