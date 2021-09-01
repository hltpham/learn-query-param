import { FormControl } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { QueryParamManagerService } from './query-param-manager.service';

export class QueryParamManagerState {
  private id: number;
  private parent: QueryParamManagerService;
  private formControls: [FormControl, string][] = [];
  private stop$: Observable<any>;

  public addFormControl(
    formControl: FormControl,
    key: string
  ): QueryParamManagerState {
    this.formControls = [...this.formControls, [formControl, key]];
    return this;
  }

  public takeUntil(
    stop$: Observable<any> | ((source: Observable<any>) => Observable<any>)
  ): QueryParamManagerState {
    if (typeof stop$ === 'function') {
      // skip functional stop operator
    } else {
      this.stop$ = stop$;
    }
    return this;
  }

  public sync() {
    if (!this.stop$) {
      throw new Error(
        // tslint:disable-next-line
        'You must pass an observable or operator to the `takeUntil` method before you can sync query params with the MtrQueryParamManager.'
      );
    }
    // Add the state item with a unique id
    this.parent['addStateItem'](this.id, this);
    // Remove the state item when takeUntil emits or the observable is completed
    this.stop$

      .pipe(
        take(1),
        finalize(() => {
          this.parent['removeStateItem'](this.id);
        })
      )
      .subscribe(() => {
        this.parent['removeStateItem'](this.id);
      });
    return this.parent['params$'];
  }
}
