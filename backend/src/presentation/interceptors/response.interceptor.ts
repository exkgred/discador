import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    page?: number;
    perPage?: number;
    total?: number;
    lastPage?: number;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const requestId = request.headers['x-request-id'] ?? crypto.randomUUID();

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'total' in data &&
          'page' in data &&
          'perPage' in data
        ) {
          const paginated = data as {
            items: unknown;
            total: number;
            page: number;
            perPage: number;
          };
          const lastPage = Math.max(
            1,
            Math.ceil(paginated.total / paginated.perPage) || 1,
          );
          return {
            success: true as const,
            data: paginated.items as T,
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              page: paginated.page,
              perPage: paginated.perPage,
              total: paginated.total,
              lastPage,
            },
          };
        }

        return {
          success: true as const,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        };
      }),
    );
  }
}
