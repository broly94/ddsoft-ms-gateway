import { RpcExceptionFilter } from '../src/common/filters/rpc-exception.filter';

describe('RpcExceptionFilter', () => {
  it('should be defined', () => {
    expect(new RpcExceptionFilter()).toBeDefined();
  });
});
