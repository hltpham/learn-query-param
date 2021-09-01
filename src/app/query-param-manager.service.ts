import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Params, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { debounceTime, delay, distinctUntilChanged, filter, map, shareReplay, startWith, switchMap, take, tap } from 'rxjs/operators';
import { QueryParamManagerState } from './query-param-manager-state';

@Injectable()
export class QueryParamManagerService {
  private stateItems = new BehaviorSubject<Map<number, QueryParamManagerState>>(
    new Map<number, QueryParamManagerState>()
  );
  private skipRouterEvents$ = new BehaviorSubject<boolean>(false);
  private initialized$ = new BehaviorSubject<boolean>(false);
  private uniqueStateId = 0;

  private params$ = combineLatest([
    this.stateItems,
    this.initialized$.pipe(filter((init) => !!init)),
  ]).pipe(
    map(([stateItems, _]) => {
      return this.activatedRoute.queryParams.pipe(
        take(1),
        delay(0),
        tap((queryParams: Params) => {
          stateItems.forEach(item => {
            Object.entries(queryParams).forEach(param => {
              this.syncFormControls(item['formControls'], param)
            });
          }) 
        }),
        switchMap(() => {
          return combineLatest([
            this.router.events.pipe(
              filter(event => event instanceof NavigationEnd),
              switchMap(() => this.skipRouterEvents$.pipe(take(1))),
              filter((doSkip) => !doSkip),
              startWith(true),
              map(() => [])
            ),
            ...Array.from(stateItems.values()).map(item => 
              combineLatest([
                ...this.composeFormControlObservables(item['formControls'])
              ]).pipe(
                stateItems['stop$'] 
              )
              )
          ])
        }),
        debounceTime(180),
        shareReplay(1)
      )
    })
  )

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    // Check if we need to wait for a router event before init
    if (this.router.navigated) {
      this.initialized$.next(true);
    } else {
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          take(1)
        )
        .subscribe(() => {
          this.initialized$.next(true);
        });
    }

    // Listens for param changes and syncs changes accordingly
    this.params$.subscribe((props) => {
      this.skipRouterEvents$.next(true);
      this.syncPropsToQueryParams(props);
      setTimeout(() => {
        this.skipRouterEvents$.next(false);
      });
    });
  }

  public addFormControl(
    formControl: FormControl,
    key: string
  ): QueryParamManagerState {
    return this.stateItemFactory().addFormControl(formControl, key);
  }

  public takeUntil(
    stop$: Observable<any> | ((source: Observable<any>) => Observable<any>)
  ): QueryParamManagerState {
    return this.stateItemFactory().takeUntil(stop$);
  }

  private stateItemFactory() {
    const item = new QueryParamManagerState();
    item['parent'] = this;
    item['id'] = this.uniqueStateId;
    this.uniqueStateId++;
    return item;
  }

  private addStateItem(id: number, item: QueryParamManagerState) {
    this.stateItems.next(this.stateItems.value.set(id, item));
  }

  private removeStateItem(id: number) {
    const newStateItems = this.stateItems.value;
    if (newStateItems.delete(id)) {
      this.stateItems.next(newStateItems);
    }
  }

  private syncFormControls(
    formControls: [FormControl, string][],
    [key, value]: [string, string],
  ) {
    formControls.forEach(([formControl, forKey]) => {
      if (forKey === key) {
        formControl.setValue(formControl.value ?? null);
      }
    });
  }

  private composeFormControlObservables(formControls: [FormControl, string][]) {
    return formControls.map(([formControl, forKey]) => {
      return formControl.valueChanges.pipe(
        startWith(formControl.value),
        distinctUntilChanged(),
        map((value) => ({
          [forKey]: value,
        }))
      );
    });
  }

  private syncPropsToQueryParams(
    props: Record<string, any>,
  ) {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: props,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
