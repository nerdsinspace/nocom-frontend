import { TestBed } from '@angular/core/testing';

import { StompConfigurationService } from './stomp-configuration.service';

describe('StompConfigurationService', () => {
  let service: StompConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StompConfigurationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
