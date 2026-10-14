class AIError extends Error {
  constructor(code,message,status=502){super(message);this.name='AIError';this.code=code;this.status=status;}
}
module.exports={AIError};