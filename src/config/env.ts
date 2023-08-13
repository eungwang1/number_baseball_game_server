import * as dotenv from 'dotenv';
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev',
});
export default () => {
  return {
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
};
