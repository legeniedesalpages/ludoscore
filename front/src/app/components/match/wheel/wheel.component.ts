/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 29/06/2024 - 14:51:03
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 29/06/2024
    * - Author          : renau
    * - Modification    : 
**/
import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  OnInit,
  ViewChild
} from "@angular/core";
import { Navigate } from "@ngxs/router-plugin";
import { Select, Store } from "@ngxs/store";
import { Observable } from "rxjs";
import { ColorTag } from "src/app/core/model/color-tag.model";
import { Player } from "src/app/core/model/player.model";
import { ChangeFirstPlayer } from "src/app/core/state/match/match.action";
import { MatchState } from "src/app/core/state/match/match.state";


@Component({
  selector: "app-wheel",
  templateUrl: "./wheel.component.html",
  styleUrls: ["./wheel.component.css"]
})
export class WheelComponent implements OnInit, AfterViewInit, DoCheck {

  @Select(MatchState.players) players!: Observable<Player[]>;

  @ViewChild("wheel") wheel: ElementRef<HTMLCanvasElement> | undefined;
  @ViewChild("spin") spin: ElementRef | undefined;
  sectors: any[] = [];
  winner: Player | undefined;

  tot: any;
  ctx: any;
  dia: any;
  rad: any;
  PI: any;
  TAU: any;
  arc0: any;

  private rand = (m: any, M: any) => Math.random() * (M - m) + m;
  friction = this.rand(0.992, 0.998);
  angularVelocity = 0;
  angleInRadians = 0;
  lastSelection: any;

  constructor(private store: Store) {
    this.sectors = store.selectSnapshot(MatchState.players).map((player: Player, i) => {
      return {
        color: player.color,
        label: this.truncateString(player.name, 8),
        player: player
      };
    });

    if (this.wheel) {
      this.createWheel();
    }
  }

  ngDoCheck(): void {
    this.engine();
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.createWheel();
  }

  truncateString(str: string, num: number) {
    if (str.length <= num) {
      return str
    }
    return str.slice(0, num) + '.'
  }

  createWheel() {
    if (this.wheel) {
      this.ctx = this.wheel.nativeElement.getContext("2d");
      this.dia = this.ctx.canvas.width;
      this.tot = this.sectors.length;
      this.rad = this.dia / 2;
      this.PI = Math.PI;
      this.TAU = 2 * this.PI;

      this.arc0 = this.TAU / this.sectors.length;
      this.sectors.forEach((sector, i) => this.drawSector(sector, i));
      this.rotate(true);
    }
  }

  spinner() {
    this.friction = this.rand(0.992, 0.999);
    if (!this.angularVelocity) this.angularVelocity = this.rand(0.25, 0.35);
  }

  getIndex = () =>
    Math.floor(this.tot - (this.angleInRadians / this.TAU) * this.tot) % this.tot;

  drawSector(sector: { color: ColorTag; label: any; player:Player }, i: number) {
    const ang = this.arc0 * i;
    this.ctx.save();
    // COLOR
    this.ctx.beginPath();
    this.ctx.fillStyle = sector.color.code;
    this.ctx.moveTo(this.rad, this.rad);

    this.ctx.arc(this.rad, this.rad, this.rad, ang, ang + this.arc0);
    this.ctx.lineTo(this.rad, this.rad);
    this.ctx.fill();

    this.ctx.fillStyle = "#000";
    this.ctx.moveTo(this.rad, this.rad);

    this.ctx.arc(this.rad, this.rad, this.rad, ang, ang + this.arc0);
    this.ctx.lineTo(this.rad, this.rad);
    this.ctx.stroke();
    // TEXT
    this.ctx.translate(this.rad, this.rad);
    this.ctx.rotate(ang + this.arc0 / 2);
    this.ctx.textAlign = "right";
    console.log(sector.color);
    this.ctx.fillStyle = sector.color.invert;
    this.ctx.font = "bold 30px sans-serif";
    this.ctx.fillText(sector.label, this.rad - 10, 10);
    //
    this.ctx.restore();
  }

  rotate(first = false) {
    const sector = this.sectors[this.getIndex()];
    this.ctx.canvas.style.transform = `rotate(${this.angleInRadians - this.PI / 2}rad)`;
    if (this.spin && this.spin.nativeElement) {
      this.spin.nativeElement.textContent = !this.angularVelocity ? "Lancer" : sector.label;
      if (!first) {
        this.lastSelection = !this.angularVelocity ? this.lastSelection : this.getIndex();
      }
      this.spin.nativeElement.style.background = sector.color.code;
      this.spin.nativeElement.style.color = sector.color.invert;
    }
  }

  frame() {
    if (!this.angularVelocity) return;

    this.angularVelocity *= this.friction; // Decrement velocity by friction
    if (this.angularVelocity < 0.001) this.angularVelocity = 0; // Bring to stop
    this.angleInRadians += this.angularVelocity; // Update angle
    this.angleInRadians %= this.TAU; // Normalize angle
    this.rotate();
    this.checkWinner();
  }

  engine() {
    requestAnimationFrame(this.frame.bind(this));
  }

  checkWinner() {
    if (!this.angularVelocity) {
      this.winner = this.sectors[this.lastSelection].player
      console.log("player randomly choosen", this.winner);
      if (this.spin && this.spin.nativeElement) {        
        this.spin.nativeElement.textContent = this.sectors[this.lastSelection].label;
      }
    }
  }

  public returnToPlayerSelection() {
    if (this.winner) {
      this.store.dispatch(new ChangeFirstPlayer(this.winner)).subscribe(() => {
        this.store.dispatch(new Navigate(['/player-selection']))
      })
    } else {
      this.store.dispatch(new Navigate(['/player-selection']))  
    }
  }
}
